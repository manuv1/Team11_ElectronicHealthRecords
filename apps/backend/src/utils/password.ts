import crypto from "crypto";

const HASH_SEPARATOR = ".";

export const hashPassword = async (password: string): Promise<string> => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key as Buffer);
    });
  });

  return [salt, derivedKey.toString("hex")].join(HASH_SEPARATOR);
};

export const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  const [salt, storedHash] = hashedPassword.split(HASH_SEPARATOR);

  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(key as Buffer);
    });
  });

  return crypto.timingSafeEqual(Buffer.from(storedHash, "hex"), derivedKey);
};
