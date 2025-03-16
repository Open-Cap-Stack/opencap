-- Initialize test database schema

-- Create datasets table with the file_size column that was missing
CREATE TABLE IF NOT EXISTS datasets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    file_size BIGINT,  -- This was the missing column in the failing tests
    format VARCHAR(50),
    status VARCHAR(50),
    created_by INTEGER,
    last_modified_by INTEGER
);

-- Create financial_reports table
CREATE TABLE IF NOT EXISTS financial_reports (
    id SERIAL PRIMARY KEY,
    report_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    total_revenue DECIMAL(15, 2) NOT NULL,
    total_expenses DECIMAL(15, 2) NOT NULL,
    net_income DECIMAL(15, 2) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'draft',
    created_by INTEGER,
    approved_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for auth testing
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create any other tables needed for tests
