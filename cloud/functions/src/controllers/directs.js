// eslint-disable-next-line no-unused-vars
const express = require("express");
const {
  firestore,
  FieldValue,
  getFirestoreData,
  timeDiff,
  convertTimestampToDate,
  sha256,
} = require("../utils");
const { v4: uuidv4 } = require("uuid");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createDirect = async (req, res, next) => {
  try {
    const { userId, workspaceId } = req.body;
    const { uid } = res.locals;

    const isMe = userId === uid;

    const workspace = await getFirestoreData(`Workspace/${workspaceId}`);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of this workspace");

    const snapshot = await firestore
      .collection("Direct")
      .where("workspaceId", "==", workspaceId)
      .where("members", "array-contains", uid)
      .orderBy("createdAt", "desc")
      .get();
    const dms = [];
    snapshot.forEach((doc) => dms.push(doc.data()));

    const activeArray = [uid];

    if (isMe) {
      const currentDm = dms.find((dm) => dm.members.length === 1);
      await firestore.doc(`Direct/${currentDm.objectId}`).update({
        updatedAt: FieldValue.serverTimestamp(),
        active: activeArray,
      });
      res.locals.data = {
        directId: currentDm.objectId,
      };
      return next();
    }

    // uid wants to send a message to another user than him
    const currentDm = dms.find((dm) => dm.members.includes(userId));

    // Activate the existing direct (a direct between uid and teammateId has been open in the past)
    if (currentDm) {
      await firestore.doc(`Direct/${currentDm.objectId}`).update({
        updatedAt: FieldValue.serverTimestamp(),
        active: FieldValue.arrayUnion(...activeArray),
      });
      res.locals.data = {
        directId: currentDm.objectId,
      };
      return next();
    }

    // Create a new direct (no direct between these users in this workspace before)
    const promises = [];
    const directMessageId = uuidv4();
    promises.push(
      firestore.doc(`Direct/${directMessageId}`).set({
        objectId: directMessageId,
        members: [uid, userId],
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        active: activeArray,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const d1 = sha256(`${uid}#${directMessageId}`);
    promises.push(
      firestore.doc(`Detail/${d1}`).set({
        objectId: d1,
        chatId: directMessageId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    const d2 = sha256(`${userId}#${directMessageId}`);
    promises.push(
      firestore.doc(`Detail/${d2}`).set({
        objectId: d2,
        chatId: directMessageId,
        userId: userId,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    res.locals.data = {
      directId: directMessageId,
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
const closeDirect = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    const direct = await getFirestoreData(`Direct/${id}`);
    if (!direct.members.includes(uid))
      throw new Error("The user is not a member of this Direct");

    await firestore.doc(`Direct/${id}`).update({
      updatedAt: FieldValue.serverTimestamp(),
      active: FieldValue.arrayRemove(uid),
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
const typingIndicator = async (req, res, next) => {
  try {
    const { id: dmId } = req.params;
    const { isTyping } = req.body;
    const { uid } = res.locals;

    const direct = await getFirestoreData(`Direct/${dmId}`);

    if (!direct.members.includes(uid))
      throw new Error("The user is not in the Direct.");

    if (
      (isTyping && !direct.typing.includes(uid)) ||
      (!isTyping && direct.typing.includes(uid))
    ) {
      await firestore.doc(`Direct/${dmId}`).update({
        typing: isTyping
          ? FieldValue.arrayUnion(uid)
          : FieldValue.arrayRemove(uid),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

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
const resetTyping = async (req, res, next) => {
  try {
    const { id: dmId } = req.params;
    const { uid } = res.locals;

    const direct = await getFirestoreData(`Direct/${dmId}`);

    if (!direct.members.includes(uid))
      throw new Error("The user is not in the Direct.");

    if (
      timeDiff(convertTimestampToDate(direct.lastTypingReset), Date.now()) >=
        30 &&
      direct.typing.length > 0
    ) {
      await firestore.doc(`Direct/${dmId}`).update({
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    res.locals.data = {
      success: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  closeDirect,
  createDirect,
  typingIndicator,
  resetTyping,
};
