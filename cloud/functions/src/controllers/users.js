// eslint-disable-next-line no-unused-vars
const express = require("express");
const { USER_THUMBNAIL_WIDTH } = require("../../config");
const {
  firestore,
  FieldValue,
  auth,
  firef,
  getTransactionData,
  sha256,
} = require("../utils");
const {
  saveImageThumbnail,
  createPersistentDownloadUrlWithMetadata,
} = require("../utils/storage");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const user = await auth.createUser({
      email,
      password,
      displayName: name,
    });
    const uid = user.uid;

    await firestore.doc(`User/${uid}`).set({
      objectId: uid,
      fullName: name,
      displayName: name,
      email,
      phoneNumber: "",
      title: "",
      theme: "",
      photoURL: "",
      thumbnailURL: "",
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    res.locals.data = {
      uid,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const updateUser = async (req, res, next) => {
  try {
    const { photoPath, fullName, displayName, title, phoneNumber, theme } =
      req.body;
    const { id } = req.params;
    const { uid } = res.locals;

    if (id !== uid) throw new Error("Not allowed.");

    if (displayName === "") throw new Error("Display name must be provided.");
    if (fullName === "") throw new Error("Full name must be provided.");
    if (photoPath && !photoPath.startsWith(`User/${uid}`))
      throw new Error("Not allowed.");

    await firestore.runTransaction(async (transaction) => {
      const [photoURL, metadata] =
        await createPersistentDownloadUrlWithMetadata(photoPath);
      const [thumbnailURL] = await saveImageThumbnail(
        photoPath,
        USER_THUMBNAIL_WIDTH,
        USER_THUMBNAIL_WIDTH,
        metadata
      );

      if (displayName) await auth.updateUser(uid, { displayName });

      transaction.update(firef(`User/${uid}`), {
        ...(title != null && { title }),
        ...(photoPath != null && { photoURL, thumbnailURL }),
        ...(phoneNumber != null && { phoneNumber }),
        ...(displayName && { displayName }),
        ...(fullName && { fullName }),
        ...(theme && { theme }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const updatePresence = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    if (id !== uid) throw new Error("Not allowed.");

    await firestore.doc(`User/${uid}`).update({
      lastPresence: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const read = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;
    const { chatType, chatId } = req.body;

    if (id !== uid) throw new Error("Not allowed.");

    const detailId = sha256(`${uid}#${chatId}`);

    await firestore.runTransaction(async (transaction) => {
      const detailPromise = getTransactionData(
        transaction,
        `Detail/${detailId}`
      );
      const chatPromise = getTransactionData(
        transaction,
        `${chatType}/${chatId}`
      );

      const [detail, chat] = await Promise.all([detailPromise, chatPromise]);

      if (uid !== detail.userId) throw new Error("Not allowed.");
      if (chatId !== detail.chatId) throw new Error("An error has occured.");

      transaction.update(firef(`Detail/${detailId}`), {
        lastRead: chat.lastMessageCounter,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createUser,
  updateUser,
  updatePresence,
  read,
};
