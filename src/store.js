import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';

const clone = (value) => value === undefined ? undefined : structuredClone(value);

function pathValue(object, path) {
  return path.split('.').reduce((value, key) => value == null ? undefined : value[key], object);
}

function comparable(value) {
  if (value instanceof Date) return value.getTime();
  if (value && typeof value === 'object' && typeof value.toDate === 'function') return value.toDate().getTime();
  return value;
}

function matchesValue(actual, expected) {
  if (expected && typeof expected === 'object' && !(expected instanceof Date) && !Array.isArray(expected)) {
    for (const [operator, operand] of Object.entries(expected)) {
      const left = comparable(actual);
      const right = comparable(operand);
      if (operator === '$in' && !operand.some((entry) => entry === actual)) return false;
      if (operator === '$nin' && operand.some((entry) => entry === actual)) return false;
      if (operator === '$regex' && !new RegExp(operand, expected.$options ?? '').test(String(actual ?? ''))) return false;
      if (operator === '$options') continue;
      if (operator === '$ne' && actual === operand) return false;
      if (operator === '$eq' && actual !== operand) return false;
      if (operator === '$gt' && !(left > right)) return false;
      if (operator === '$gte' && !(left >= right)) return false;
      if (operator === '$lt' && !(left < right)) return false;
      if (operator === '$lte' && !(left <= right)) return false;
      if (operator === '$exists' && ((actual !== undefined) !== Boolean(operand))) return false;
    }
    return true;
  }
  return actual === expected;
}

function matches(document, query = {}) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some((queryPart) => matches(document, queryPart));
    if (key === '$and') return value.every((queryPart) => matches(document, queryPart));
    return matchesValue(pathValue(document, key), value);
  });
}

function applyUpdate(document, update, { isInsert = false } = {}) {
  const next = clone(document);
  if (!Object.keys(update).some((key) => key.startsWith('$'))) return clone(update);
  for (const [operator, values] of Object.entries(update)) {
    if (operator === '$setOnInsert' && !isInsert) continue;
    for (const [key, value] of Object.entries(values ?? {})) {
      if (operator === '$set' || operator === '$setOnInsert') next[key] = clone(value);
      else if (operator === '$inc') next[key] = (Number(next[key]) || 0) + value;
      else if (operator === '$unset') delete next[key];
      else if (operator === '$push') next[key] = [...(next[key] ?? []), clone(value)];
      else if (operator === '$addToSet') {
        const valuesArray = next[key] ?? [];
        if (!valuesArray.some((item) => JSON.stringify(item) === JSON.stringify(value))) valuesArray.push(clone(value));
        next[key] = valuesArray;
      }
    }
  }
  return next;
}

class MemoryCursor {
  constructor(collection, query) {
    this.collection = collection;
    this.query = query;
    this.sortSpec = null;
    this.skipCount = 0;
    this.limitCount = Infinity;
  }
  sort(spec) { this.sortSpec = spec; return this; }
  skip(count) { this.skipCount = Math.max(0, count); return this; }
  limit(count) { this.limitCount = Math.max(0, count); return this; }
  async toArray() {
    let result = this.collection.documents.filter((row) => matches(row, this.query)).map(clone);
    if (this.sortSpec) {
      const sortKeys = Object.entries(this.sortSpec);
      result.sort((a, b) => {
        for (const [key, direction] of sortKeys) {
          const left = comparable(pathValue(a, key));
          const right = comparable(pathValue(b, key));
          if (left < right) return -1 * direction;
          if (left > right) return 1 * direction;
        }
        return 0;
      });
    }
    return result.slice(this.skipCount, this.skipCount + this.limitCount);
  }
}

class MemoryCollection {
  constructor(name) { this.name = name; this.documents = []; }
  find(query = {}) { return new MemoryCursor(this, query); }
  async findOne(query = {}) { return clone(this.documents.find((row) => matches(row, query))); }
  async insertOne(document) {
    const row = clone(document);
    row._id ??= randomUUID();
    if (this.documents.some((item) => item._id === row._id)) throw new Error(`Duplicate key in ${this.name}`);
    this.documents.push(row);
    return { acknowledged: true, insertedId: row._id };
  }
  async updateOne(query, update, options = {}) {
    const index = this.documents.findIndex((row) => matches(row, query));
    if (index < 0) {
      if (!options.upsert) return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
      const base = {};
      for (const [key, value] of Object.entries(query)) {
        if (!key.startsWith('$') && !(value && typeof value === 'object' && Object.keys(value).some((part) => part.startsWith('$')))) base[key] = clone(value);
      }
      const insertUpdate = { ...update, $setOnInsert: { ...(update.$setOnInsert ?? {}), _id: update.$setOnInsert?._id ?? randomUUID() } };
      this.documents.push(applyUpdate(base, insertUpdate, { isInsert: true }));
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0, upsertedCount: 1 };
    }
    this.documents[index] = applyUpdate(this.documents[index], update);
    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }
  async updateMany(query, update) {
    let modifiedCount = 0;
    this.documents = this.documents.map((row) => {
      if (!matches(row, query)) return row;
      modifiedCount += 1;
      return applyUpdate(row, update);
    });
    return { acknowledged: true, matchedCount: modifiedCount, modifiedCount };
  }
  async deleteOne(query) {
    const index = this.documents.findIndex((row) => matches(row, query));
    if (index < 0) return { acknowledged: true, deletedCount: 0 };
    this.documents.splice(index, 1);
    return { acknowledged: true, deletedCount: 1 };
  }
  async deleteMany(query) {
    const oldLength = this.documents.length;
    this.documents = this.documents.filter((row) => !matches(row, query));
    return { acknowledged: true, deletedCount: oldLength - this.documents.length };
  }
  async countDocuments(query = {}) { return this.documents.filter((row) => matches(row, query)).length; }
  async createIndex() { return 'memory-index'; }
}

export function createMemoryDb() {
  const collections = new Map();
  return {
    mode: 'memory',
    collection(name) {
      if (!collections.has(name)) collections.set(name, new MemoryCollection(name));
      return collections.get(name);
    },
    async close() {},
  };
}

export async function ensureIndexes(db) {
  await Promise.all([
    db.collection('users').createIndex({ emailNormalized: 1 }, { unique: true }),
    db.collection('restaurants').createIndex({ slug: 1 }, { unique: true }),
    db.collection('memberships').createIndex({ userId: 1, restaurantId: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('invitations').createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection('invitations').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('publishedMenus').createIndex({ restaurantId: 1 }, { unique: true }),
    db.collection('auditEvents').createIndex({ restaurantId: 1, createdAt: -1 }),
    db.collection('auditEvents').createIndex({ actorUserId: 1, createdAt: -1 }),
  ]);
}

export async function connectMongo({ uri, dbName }) {
  if (!uri) throw new Error('MONGODB_URI is required unless DEMO_MODE=true.');
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  const db = client.db(dbName);
  await ensureIndexes(db);
  return {
    db,
    close: () => client.close(),
    client,
  };
}