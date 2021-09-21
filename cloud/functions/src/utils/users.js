const { firestore } = require("../utils");

const getUserByEmail = async (email) => {
  let user;
  const snapshot = await firestore
    .collection("User")
    .where("email", "==", email)
    .limit(1)
    .get();
  if (snapshot.empty) {
    throw new Error("User not found.");
  }
  snapshot.forEach((doc) => {
    user = doc.data();
  });
  console.log(user);
  return user;
};

module.exports = {
  getUserByEmail,
};
