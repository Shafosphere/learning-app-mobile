import {
  getDB,
  resetDbInitializationState,
  retryDbInitialization,
  setDbInitializer,
} from "@/src/db/sqlite/core";

describe("database initialization sharing and retries", () => {
  afterEach(async () => {
    await resetDbInitializationState();
  });

  it("shares one initialization promise between callers", async () => {
    let resolve!: (value: any) => void;
    const initializer = jest.fn(
      () => new Promise((done) => { resolve = done; })
    );
    setDbInitializer(initializer as any);

    const first = getDB();
    const second = getDB();
    expect(initializer).toHaveBeenCalledTimes(1);

    const db = { closeAsync: jest.fn() } as any;
    resolve(db);
    await expect(Promise.all([first, second])).resolves.toEqual([db, db]);
  });

  it("starts fresh initialization after retry", async () => {
    const firstDb = { closeAsync: jest.fn().mockResolvedValue(undefined) } as any;
    const secondDb = { closeAsync: jest.fn().mockResolvedValue(undefined) } as any;
    const initializer = jest.fn()
      .mockResolvedValueOnce(firstDb)
      .mockResolvedValueOnce(secondDb);
    setDbInitializer(initializer);

    await getDB();
    await expect(retryDbInitialization()).resolves.toBe(secondDb);
    expect(firstDb.closeAsync).toHaveBeenCalledTimes(1);
    expect(initializer).toHaveBeenCalledTimes(2);
  });
});
