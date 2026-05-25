/**
 * User Model
 * Handles user-related database operations
 */

const { db } = require('../config/firebase');
const bcrypt = require('bcryptjs');

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data { email, password, username }
   * @returns {Promise<Object>} Created user
   */
  static async create(userData) {
    const { email, password, username } = userData;

    // Check if user exists
    const existingUser = await db.collection('users').where('email', '==', email).get();
    if (!existingUser.empty) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userDoc = {
      email,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'offline',
      profileImage: null,
      bio: '',
      friends: [],
    };

    const docRef = await db.collection('users').add(userDoc);
    return { id: docRef.id, ...userDoc };
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User document
   */
  static async getById(userId) {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) {
      throw new Error('User not found');
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @returns {Promise<Object>} User document
   */
  static async getByEmail(email) {
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) {
      throw new Error('User not found');
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update user status
   * @param {string} userId - User ID
   * @param {string} status - Status (online/offline)
   */
  static async updateStatus(userId, status) {
    await db.collection('users').doc(userId).update({
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Verify password
   * @param {string} password - Password to verify
   * @param {string} hashedPassword - Hashed password from DB
   * @returns {Promise<boolean>} True if password matches
   */
  static async verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Get all users (for contact list)
   * @returns {Promise<Array>} List of users
   */
  static async getAllUsers() {
    const snapshot = await db.collection('users').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  }
}

module.exports = User;
