/**
 * Vector Service Layer
 * 
 * Provides vector search and embedding functionality for OpenCap
 * using ZeroDB for document search, compliance checking, and analytics
 */

const zerodbService = require('./zerodbService');
const { v4: uuidv4 } = require('uuid');

class VectorService {
  constructor() {
    this.documentNamespace = 'documents';
    this.complianceNamespace = 'compliance';
    this.financialNamespace = 'financial';
    this.userNamespace = 'users';
  }
  
  /**
   * Initialize vector service
   * @param {string} token - JWT token for authentication
   */
  async initialize(token) {
    try {
      await zerodbService.initialize(token);
      console.log('Vector service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize vector service:', error);
      throw error;
    }
  }
  
  /**
   * Generate embedding for text (placeholder - would integrate with actual embedding service)
   * @param {string} text - Text to embed
   * @returns {Array} Vector embedding
   */
  async generateEmbedding(text) {
    // Placeholder implementation - in production would use OpenAI, Cohere, etc.
    // For now, generate a simple hash-based vector
    const hash = this.simpleHash(text);
    const embedding = [];
    
    // Generate 768-dimensional vector (common for sentence transformers)
    for (let i = 0; i < 768; i++) {
      embedding.push(Math.sin(hash * (i + 1)) * 0.1);
    }
    
    return embedding;
  }
  
  /**
   * Simple hash function for demo purposes
   * @param {string} str - Input string
   * @returns {number} Hash value
   */
  simpleHash(str) {
    let hash = 0;
    if (str.length === 0) return hash;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  /**
   * Index a document with vector embedding
   * @param {string} documentId - Document identifier
   * @param {string} title - Document title
   * @param {string} content - Document content
   * @param {string} type - Document type (financial_report, compliance_doc, etc.)
   * @param {Object} metadata - Additional metadata
   * @returns {Object} Indexed document details
   */
  async indexDocument(documentId, title, content, type, metadata = {}) {
    try {
      // Generate embedding for document content
      const embedding = await this.generateEmbedding(content);
      
      // Prepare metadata
      const vectorMetadata = {
        document_id: documentId,
        title,
        type,
        indexed_at: new Date().toISOString(),
        ...metadata
      };
      
      // Store in appropriate namespace based on type
      let namespace = this.documentNamespace;
      if (type === 'compliance_document') {
        namespace = this.complianceNamespace;
      } else if (type === 'financial_report') {
        namespace = this.financialNamespace;
      }
      
      const result = await zerodbService.upsertVector(
        embedding,
        namespace,
        vectorMetadata,
        content,
        `document:${documentId}`
      );
      
      console.log(`Document indexed successfully: ${documentId}`);
      return result;
    } catch (error) {
      console.error('Error indexing document:', error);
      throw error;
    }
  }
  
  /**
   * Search for similar documents
   * @param {string} queryText - Search query
   * @param {string} namespace - Search namespace
   * @param {number} limit - Maximum results
   * @param {Object} filters - Additional filters
   * @returns {Object} Search results
   */
  async searchDocuments(queryText, namespace = this.documentNamespace, limit = 10, filters = {}) {
    try {
      // Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(queryText);
      
      // Search vectors
      const results = await zerodbService.searchVectors(queryEmbedding, limit, namespace);
      
      // Filter results based on additional criteria
      let filteredResults = results.vectors || [];
      
      if (filters.type) {
        filteredResults = filteredResults.filter(v => 
          v.vector_metadata?.type === filters.type
        );
      }
      
      if (filters.dateRange) {
        filteredResults = filteredResults.filter(v => {
          const indexedAt = new Date(v.vector_metadata?.indexed_at);
          return indexedAt >= filters.dateRange.start && indexedAt <= filters.dateRange.end;
        });
      }
      
      return {
        query: queryText,
        results: filteredResults,
        total_count: filteredResults.length,
        search_time_ms: results.search_time_ms || 0
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }
  
  /**
   * Search financial documents
   * @param {string} queryText - Search query
   * @param {number} limit - Maximum results
   * @param {Object} filters - Additional filters
   * @returns {Object} Search results
   */
  async searchFinancialDocuments(queryText, limit = 10, filters = {}) {
    return this.searchDocuments(queryText, this.financialNamespace, limit, filters);
  }
  
  /**
   * Search compliance documents
   * @param {string} queryText - Search query
   * @param {number} limit - Maximum results
   * @param {Object} filters - Additional filters
   * @returns {Object} Search results
   */
  async searchComplianceDocuments(queryText, limit = 10, filters = {}) {
    return this.searchDocuments(queryText, this.complianceNamespace, limit, filters);
  }
  
  /**
   * Find similar documents to a given document
   * @param {string} documentId - Source document ID
   * @param {number} limit - Maximum results
   * @returns {Object} Similar documents
   */
  async findSimilarDocuments(documentId, limit = 5) {
    try {
      // Get all vectors to find the source document
      const allVectors = await zerodbService.listVectors(this.documentNamespace, 0, 1000);
      
      const sourceDoc = allVectors.find(v => 
        v.vector_metadata?.document_id === documentId
      );
      
      if (!sourceDoc) {
        throw new Error(`Document ${documentId} not found in vector database`);
      }
      
      // Search for similar documents using the source document's embedding
      const results = await zerodbService.searchVectors(
        sourceDoc.vector_embedding,
        limit + 1, // +1 to exclude the source document
        this.documentNamespace
      );
      
      // Remove the source document from results
      const similarDocs = (results.vectors || []).filter(v => 
        v.vector_metadata?.document_id !== documentId
      );
      
      return {
        source_document_id: documentId,
        similar_documents: similarDocs.slice(0, limit),
        total_count: similarDocs.length
      };
    } catch (error) {
      console.error('Error finding similar documents:', error);
      throw error;
    }
  }
  
  /**
   * Check document compliance using vector similarity
   * @param {string} documentContent - Document content to check
   * @param {Array} complianceRules - Compliance rules to check against
   * @returns {Object} Compliance check results
   */
  async checkCompliance(documentContent, complianceRules = []) {
    try {
      const complianceResults = [];
      
      for (const rule of complianceRules) {
        const searchResult = await this.searchComplianceDocuments(
          rule.query,
          5,
          { type: rule.type }
        );
        
        complianceResults.push({
          rule_id: rule.id,
          rule_name: rule.name,
          matches: searchResult.results.length,
          top_matches: searchResult.results.slice(0, 3),
          compliance_score: this.calculateComplianceScore(searchResult.results)
        });
      }
      
      return {
        document_content: documentContent.substring(0, 200) + '...',
        compliance_checks: complianceResults,
        overall_compliance_score: this.calculateOverallComplianceScore(complianceResults)
      };
    } catch (error) {
      console.error('Error checking compliance:', error);
      throw error;
    }
  }
  
  /**
   * Calculate compliance score based on search results
   * @param {Array} results - Search results
   * @returns {number} Compliance score (0-1)
   */
  calculateComplianceScore(results) {
    if (results.length === 0) return 0;
    
    // Simple scoring based on number of matches and their relevance
    const scoreSum = results.reduce((sum, result) => {
      // Assume higher similarity means better compliance
      return sum + (result.similarity_score || 0.5);
    }, 0);
    
    return Math.min(scoreSum / results.length, 1);
  }
  
  /**
   * Calculate overall compliance score
   * @param {Array} complianceResults - Compliance check results
   * @returns {number} Overall compliance score (0-1)
   */
  calculateOverallComplianceScore(complianceResults) {
    if (complianceResults.length === 0) return 0;
    
    const scoreSum = complianceResults.reduce((sum, result) => {
      return sum + result.compliance_score;
    }, 0);
    
    return scoreSum / complianceResults.length;
  }
  
  /**
   * Get document analytics
   * @param {string} namespace - Namespace to analyze
   * @returns {Object} Analytics data
   */
  async getDocumentAnalytics(namespace = this.documentNamespace) {
    try {
      const vectors = await zerodbService.listVectors(namespace, 0, 1000);
      
      const analytics = {
        total_documents: vectors.length,
        document_types: {},
        indexed_over_time: {},
        average_embedding_dimension: 0
      };
      
      vectors.forEach(vector => {
        // Count by type
        const type = vector.vector_metadata?.type || 'unknown';
        analytics.document_types[type] = (analytics.document_types[type] || 0) + 1;
        
        // Count by date
        const indexedDate = new Date(vector.created_at).toISOString().split('T')[0];
        analytics.indexed_over_time[indexedDate] = (analytics.indexed_over_time[indexedDate] || 0) + 1;
        
        // Calculate average embedding dimension
        if (vector.vector_embedding) {
          analytics.average_embedding_dimension = vector.vector_embedding.length;
        }
      });
      
      return analytics;
    } catch (error) {
      console.error('Error getting document analytics:', error);
      throw error;
    }
  }
  
  /**
   * Delete document from vector database
   * @param {string} documentId - Document identifier
   * @returns {boolean} Success status
   */
  async deleteDocument(documentId) {
    try {
      // Note: ZeroDB API doesn't have direct delete endpoint in the documentation
      // This would need to be implemented when the delete functionality is available
      console.warn('Document deletion not implemented in ZeroDB API yet');
      return false;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new VectorService();