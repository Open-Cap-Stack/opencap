/**
 * Migration: Add permissions to users
 * [Feature] OCAE-302: Implement role-based access control
 * 
 * This migration adds permission arrays to existing users based on their roles
 */

module.exports = {
  async up(db) {
    console.log('Migrating: Adding permissions to users based on roles');
    
    // Define role-based permissions
    const rolePermissions = {
      admin: [
        'read:users', 'write:users', 'delete:users',
        'read:companies', 'write:companies', 'delete:companies',
        'read:reports', 'write:reports', 'delete:reports',
        'read:spv', 'write:spv', 'delete:spv',
        'read:assets', 'write:assets', 'delete:assets',
        'read:compliance', 'write:compliance', 'delete:compliance',
        'admin:all'
      ],
      manager: [
        'read:users', 'write:users',
        'read:companies', 'write:companies',
        'read:reports', 'write:reports',
        'read:spv', 'write:spv',
        'read:assets', 'write:assets',
        'read:compliance', 'write:compliance'
      ],
      user: [
        'read:users',
        'read:companies',
        'read:reports',
        'read:spv',
        'read:assets',
        'read:compliance',
        'write:compliance'
      ],
      client: [
        'read:users',
        'read:reports',
        'read:spv',
        'read:assets'
      ]
    };
    
    // Get all users
    const users = await db.collection('users').find({}).toArray();
    console.log(`Found ${users.length} users to update with permissions`);
    
    // Update each user with appropriate permissions
    const operations = users.map(user => {
      const role = user.role || 'user'; // Default to 'user' if no role
      const permissions = rolePermissions[role] || rolePermissions.user;
      
      return {
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { permissions } },
          upsert: false
        }
      };
    });
    
    if (operations.length > 0) {
      const result = await db.collection('users').bulkWrite(operations);
      console.log(`Updated ${result.modifiedCount} users with permissions`);
    }
    
    console.log('Migration completed: Users updated with permissions');
  },
  
  async down(db) {
    console.log('Reverting: Removing permissions from users');
    const result = await db.collection('users').updateMany(
      {}, 
      { $unset: { permissions: "" } }
    );
    console.log(`Removed permissions from ${result.modifiedCount} users`);
  }
};
