# Schema Sync Workflow Examples

## Example 1: Adding New Table

```python
# In scripts/sync-production-schema.py
def sync_new_feature_table(self):
    """Create new_feature table (Issue #XXX)"""
    print_header("Issue #XXX: New Feature")

    if self.table_exists('new_feature'):
        print_warning("Table 'new_feature' already exists - skipping")
        return

    sql = """
    CREATE TABLE new_feature (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_new_feature_name ON new_feature(name);
    CREATE INDEX idx_new_feature_created_at ON new_feature(created_at);
    """

    self.execute_sql("Create new_feature table", sql)
```

## Example 2: Adding New Column

```python
# In scripts/sync-production-schema.py
def sync_users_enhancements(self):
    """Add email_verified column to users table (Issue #XXX)"""
    print_header("Issue #XXX: Users Enhancement")

    if not self.table_exists('users'):
        print_error("Users table doesn't exist")
        return

    if not self.column_exists('users', 'email_verified'):
        self.execute_sql(
            "Add email_verified to users",
            """
            ALTER TABLE users
            ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

            CREATE INDEX idx_users_email_verified ON users(email_verified);
            """
        )
    else:
        print_warning("Column 'email_verified' already exists - skipping")
```

## Example 3: Creating Indexes

```python
def sync_performance_indexes(self):
    """Add performance indexes (Issue #XXX)"""
    print_header("Issue #XXX: Performance Indexes")

    # Check if index exists before creating
    check_sql = """
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_videos_user_id_created_at';
    """

    result = self.execute_query(check_sql)

    if not result:
        self.execute_sql(
            "Create composite index on videos",
            """
            CREATE INDEX idx_videos_user_id_created_at
            ON videos(user_id, created_at DESC);
            """
        )
    else:
        print_warning("Index 'idx_videos_user_id_created_at' already exists - skipping")
```

## Example 4: Handling Foreign Keys

```python
def sync_foreign_keys(self):
    """Add foreign key constraints (Issue #XXX)"""
    print_header("Issue #XXX: Foreign Key Constraints")

    # Check if constraint exists
    check_sql = """
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_comments_video_id'
    AND table_name = 'comments';
    """

    result = self.execute_query(check_sql)

    if not result:
        self.execute_sql(
            "Add foreign key constraint",
            """
            ALTER TABLE comments
            ADD CONSTRAINT fk_comments_video_id
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;
            """
        )
    else:
        print_warning("Foreign key 'fk_comments_video_id' already exists - skipping")
```

## Example 5: Complex Multi-Step Migration

```python
def sync_user_roles_system(self):
    """Add user roles system (Issue #XXX)"""
    print_header("Issue #XXX: User Roles System")

    # Step 1: Create roles table
    if not self.table_exists('roles'):
        self.execute_sql(
            "Create roles table",
            """
            CREATE TABLE roles (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(50) UNIQUE NOT NULL,
                permissions JSONB DEFAULT '[]'::jsonb
            );
            """
        )

    # Step 2: Add role_id to users
    if not self.column_exists('users', 'role_id'):
        self.execute_sql(
            "Add role_id to users",
            "ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id);"
        )

    # Step 3: Insert default roles
    check_sql = "SELECT COUNT(*) FROM roles WHERE name = 'admin';"
    result = self.execute_query(check_sql)

    if not result or result[0][0] == 0:
        self.execute_sql(
            "Insert default roles",
            """
            INSERT INTO roles (name, permissions) VALUES
            ('admin', '["all"]'::jsonb),
            ('user', '["read", "write"]'::jsonb),
            ('viewer', '["read"]'::jsonb);
            """
        )

## Example 6: Dry-Run Testing Workflow

```bash
# 1. Make changes to sync script
vim scripts/sync-production-schema.py

# 2. Test locally with dry-run
python scripts/sync-production-schema.py --dry-run

# Output should show:
# ✓ Existing tables/columns (skipped)
# ℹ New tables/columns (would create)
# ⚠ Warnings (if any)

# 3. Apply to local dev database
export DATABASE_URL="postgresql://localhost/myapp_dev"
python scripts/sync-production-schema.py --apply

# 4. Verify changes
psql "$DATABASE_URL" -c "\dt"
psql "$DATABASE_URL" -c "\d new_table"

# 5. Apply to staging
export DATABASE_URL="$STAGING_DATABASE_URL"
python scripts/sync-production-schema.py --dry-run  # Check first
python scripts/sync-production-schema.py --apply    # Then apply

# 6. Apply to production (via CI/CD or manual)
export DATABASE_URL="$PRODUCTION_DATABASE_URL"
python scripts/sync-production-schema.py --dry-run  # Always check
python scripts/sync-production-schema.py --apply    # Then apply
```

## Helper Functions Used in Examples

These are typically in the sync script base class:

```python
def table_exists(self, table_name):
    """Check if table exists"""
    sql = """
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = %s
    );
    """
    result = self.execute_query(sql, (table_name,))
    return result[0][0] if result else False

def column_exists(self, table_name, column_name):
    """Check if column exists in table"""
    sql = """
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = %s AND column_name = %s
    );
    """
    result = self.execute_query(sql, (table_name, column_name))
    return result[0][0] if result else False
```
