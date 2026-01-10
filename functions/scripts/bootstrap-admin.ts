import * as admin from "firebase-admin";

admin.initializeApp();

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error("Usage: node bootstrap-admin.js <uid>");
    process.exit(1);
  }

  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log("OK: set admin claim on", uid);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});