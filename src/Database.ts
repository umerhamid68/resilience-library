// import rocksdb from 'rocksdb';
// import { join } from 'path';
// import { mkdirSync, existsSync } from 'fs';

// class Database {
//     private static instance: rocksdb;
//     private static isInitialized = false;

//     private constructor() {}

//     public static async getInstance(): Promise<rocksdb> {
//         if (!Database.isInitialized) {
//             const dbPath = join(__dirname, 'db');
//             console.log(`Database path: ${dbPath}`);

//             if (!existsSync(dbPath)) {
//                 console.log(`Directory does not exist. Creating: ${dbPath}`);
//                 mkdirSync(dbPath, { recursive: true });
//             }

//             Database.instance = new rocksdb(dbPath);
//             await new Promise<void>((resolve, reject) => {
//                 Database.instance.open({ create_if_missing: true }, (err) => {
//                     if (err) {
//                         reject('Failed to open the database: ' + err);
//                     } else {
//                         console.log('Database opened successfully.');
//                         resolve();
//                     }
//                 });
//             });

//             Database.isInitialized = true;
//         }

//         return Database.instance;
//     }

//     public static async put(key: string, value: string): Promise<void> {
//         const db = await Database.getInstance();
//         return new Promise<void>((resolve, reject) => {
//             db.put(key, value, (err) => {
//                 if (err) reject(err);
//                 else resolve();
//             });
//         });
//     }

//     public static async get(key: string): Promise<string | null> {
//         const db = await Database.getInstance();
//         return new Promise<string | null>((resolve, reject) => {
//             db.get(key, (err, value) => {
//                 if (err) {
//                     if (err.message.includes('NotFound')) {
//                         resolve(null);
//                     } else {
//                         reject(err);
//                     }
//                 } else {
//                     resolve(value.toString());
//                 }
//             });
//         });
//     }

//     public static async del(key: string): Promise<void> {
//         const db = await Database.getInstance();
//         return new Promise<void>((resolve, reject) => {
//             db.del(key, (err) => {
//                 if (err) reject(err);
//                 else resolve();
//             });
//         });
//     }
// }

// export { Database };



///////////////////////////////////////////////2nd imple
// import rocksdb from 'rocksdb';
// import { mkdirSync, existsSync } from 'fs';
// import { join } from 'path';

// class Database {
//     private static instance: Database;
//     private db: rocksdb;
//     private dbReady: Promise<void>;
//     private isInitialized = false;

//     private constructor() {
//         const dbPath = join(__dirname, 'db');
//         console.log(`Database path: ${dbPath}`);

//         if (!existsSync(dbPath)) {
//             console.log(`Directory does not exist. Creating: ${dbPath}`);
//             mkdirSync(dbPath, { recursive: true });
//         }
//         console.log('here');

//         this.db = rocksdb(dbPath);
//         console.log('here2');
//         this.dbReady = new Promise((resolve, reject) => {
//             this.db.open({ create_if_missing: true }, (err) => {
//                 if (err) {
//                     console.log('Failed to open the database: ' + err);
//                     reject('Failed to open the database: ' + err);
//                 } else {
//                     console.log('Database opened successfully.');
//                     this.isInitialized = true;
//                     resolve();
//                 }
//             });
//         });
//         console.log('here3');
//     }

//     public static getInstance(): Database {
//         if (!Database.instance) {
//             console.log('here4');
//             Database.instance = new Database();
//         }
//         console.log('here5');
//         return Database.instance;
        
//     }

//     public async waitForInitialization() {
//         console.log('here6');
//         //await this.dbReady;

//     }

//     public get(key: string): Promise<string | null> {
//         console.log('here71');
//         return new Promise((resolve, reject) => {
//             this.db.get(key, (err, value) => {
//                 if (err) {
//                     if (err.message.includes('NotFound')) {
//                         resolve(null);
//                     } else {
//                         reject(err);
//                     }
//                 } else {
//                     console.log('here22');
//                     resolve(value ? value.toString() : null);
//                 }
//             });
//         });
//     }

//     public put(key: string, value: string): Promise<void> {
//         return new Promise((resolve, reject) => {
//             this.db.put(key, value, (err) => {
//                 if (err) {
//                     reject(err);
//                 } else {
//                     resolve();
//                 }
//             });
//         });
//     }

//     public del(key: string): Promise<void> {
//         return new Promise((resolve, reject) => {
//             this.db.del(key, (err) => {
//                 if (err && !err.message.includes('NotFound')) {
//                     reject(err);
//                 } else {
//                     resolve();
//                 }
//             });
//         });
//     }
// }

// export { Database };








/////////////////////////////////
import rocksdb from 'rocksdb';
import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';

class Database {
    private static instance: Database;
    private db: rocksdb;
    private isInitialized = false;

    private constructor() {
        const dbPath = join(__dirname, 'db');
        console.log(`Database path: ${dbPath}`);

        if (!existsSync(dbPath)) {
            console.log(`Directory does not exist. Creating: ${dbPath}`);
            mkdirSync(dbPath, { recursive: true });
        }

        this.db = rocksdb(dbPath);
        this.db.open({ create_if_missing: true }, (err) => {
            if (err) {
                console.log('Failed to open the database: ' + err);
            } else {
                console.log('Database opened successfully.');
                this.isInitialized = true;
            }
        });
    }

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public async waitForInitialization() {
        while (!this.isInitialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    public get(key: string): Promise<string | null> {
        return new Promise((resolve, reject) => {
            this.db.get(key, (err, value) => {
                if (err) {
                    if (err.message.includes('NotFound')) {
                        resolve(null);
                    } else {
                        reject(err);
                    }
                } else {
                    resolve(value.toString());
                }
            });
        });
    }

    public put(key: string, value: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.put(key, value, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public del(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            this.db.del(key, (err) => {
                if (err && !err.message.includes('NotFound')) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    public keys(prefix: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            const keys: string[] = [];
            const iterator = this.db.iterator();
    
            const iterate = () => {
                iterator.next((err, key) => {
                    if (err) {
                        iterator.end((endErr) => {
                            if (endErr) {
                                reject(endErr);
                            } else {
                                reject(err);
                            }
                        });
                    } else if (key) {
                        const keyStr = key.toString();
                        if (keyStr.startsWith(prefix)) {
                            keys.push(keyStr);
                        }
                        iterate();
                    } else {
                        iterator.end((endErr) => {
                            if (endErr) {
                                reject(endErr);
                            } else {
                                resolve(keys);
                            }
                        });
                    }
                });
            };
            iterate();
        });
    }    
}

export { Database };
