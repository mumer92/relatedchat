// eslint-disable-next-line no-unused-vars
const express = require("express");
const {
  firestore,
  FieldValue,
  getTransactionData,
  firef,
  getFirestoreData,
  convertTimestampToDate,
  timeDiff,
  sha256,
} = require("../utils");
const { v4: uuidv4 } = require("uuid");
const { getUserByEmail } = require("../utils/users");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createChannel = async (req, res, next) => {
  try {
    const { name, details, workspaceId, objectId: customObjectId } = req.body;
    const { uid } = res.locals;

    const workspace = await getFirestoreData(`Workspace/${workspaceId}`);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not in the workspace.");

    const snapshot = await firestore
      .collection("Channel")
      .where("name", "==", `${name.replace("#", "")}`)
      .where("workspaceId", "==", workspaceId)
      .where("isDeleted", "==", false)
      .limit(1)
      .get();
    if (snapshot.docs.length) throw new Error("Channel already exists.");

    const channelId = customObjectId || uuidv4();
    const promises = [];
    promises.push(
      firestore.doc(`Channel/${channelId}`).set({
        objectId: channelId,
        name: `${name.replace("#", "")}`,
        members: [uid],
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        createdBy: uid,
        isDeleted: false,
        isArchived: false,
        topic: "",
        details: details || "",
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const detailId = sha256(`${uid}#${channelId}`);
    promises.push(
      firestore.doc(`Detail/${detailId}`).set({
        objectId: detailId,
        chatId: channelId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(promises);

    res.locals.data = {
      channelId,
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
const updateChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;
    const { topic, details, name } = req.body;

    if (name != null && (name.trim() === "" || name.trim() === "#"))
      throw new Error("Channel name must be provided.");

    await firestore.runTransaction(async (transaction) => {
      const channel = await getTransactionData(
        transaction,
        `Channel/${channelId}`
      );

      if (!channel.members.includes(uid))
        throw new Error("The user is not in the channel.");

      transaction.update(firef(`Channel/${channelId}`), {
        ...(topic != null && { topic }),
        ...(details != null && { details }),
        ...(name && { name: name.replace("#", "") }),
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
const deleteChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const channel = await getTransactionData(
        transaction,
        `Channel/${channelId}`
      );
      if (!channel.members.includes(uid))
        throw new Error("The user is not in the channel.");

      transaction.update(firef(`Channel/${channelId}`), {
        updatedAt: FieldValue.serverTimestamp(),
        isDeleted: true,
      });

      const snapshot = await firestore
        .collection("Detail")
        .where("chatId", "==", channelId)
        .get();
      await Promise.all(
        snapshot.docs.map(async (doc) => {
          await doc.ref.delete();
        })
      );
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
const archiveChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const channel = await getTransactionData(
        transaction,
        `Channel/${channelId}`
      );
      if (!channel.members.includes(uid))
        throw new Error("The user is not in the channel.");

      transaction.update(firef(`Channel/${channelId}`), {
        updatedAt: FieldValue.serverTimestamp(),
        isArchived: true,
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
const unarchiveChannel = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const channel = await getTransactionData(
        transaction,
        `Channel/${channelId}`
      );
      const workspace = await getTransactionData(
        transaction,
        `Workspace/${channel.workspaceId}`
      );
      if (!workspace.members.includes(uid))
        throw new Error("The user is not in the workspace.");

      transaction.update(firef(`Channel/${channelId}`), {
        updatedAt: FieldValue.serverTimestamp(),
        isArchived: false,
        members: FieldValue.arrayUnion(uid),
      });

      if (!channel.members.includes(uid)) {
        const d1 = sha256(`${uid}#${channel.objectId}`);
        transaction.set(firef(`Detail/${d1}`), {
          objectId: d1,
          chatId: channel.objectId,
          userId: uid,
          workspaceId: channel.workspaceId,
          lastRead: channel.lastMessageCounter,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        });
      }
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
const addMember = async (req, res, next) => {
  try {
    const { id: channelId } = req.params;
    const { email } = req.body;
    const { uid } = res.locals;

    const { objectId: userId } = await getUserByEmail(email);

    await firestore.runTransaction(async (transaction) => {
      const channel = await getTransactionData(
        transaction,
        `Channel/${channelId}`
      );
      const workspace = await getTransactionData(
        transaction,
        `Workspace/${channel.workspaceId}`
      );

      if (!workspace.members.includes(uid))
        throw new Error("The user is not in this workspace.");

      if (!workspace.members.includes(userId))
        throw new Error("The user is not in this workspace.");

      transaction.update(firef(`Channel/${channelId}`), {
        updatedAt: FieldValue.serverTimestamp(),
        members: FieldValue.arrayUnion(userId),
      });

      const d1 = sha256(`${userId}#${channel.objectId}`);
      transaction.set(firef(`Detail/${d1}`), {
        objectId: d1,
        chatId: channel.objectId,
        userId,
        workspaceId: channel.workspaceId,
        lastRead: channel.lastMessageCounter,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
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
const deleteMember = async (req, res, next) => {
  try {
    const { id: channelId, userId } = req.params;
    const { uid } = res.locals;

    const channel = await getFirestoreData(`Channel/${channelId}`);
    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    await firestore.doc(`Channel/${channelId}`).update({
      members: FieldValue.arrayRemove(userId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await firestore
      .collection("Detail")
      .where("chatId", "==", channelId)
      .where("userId", "==", userId)
      .get();
    await Promise.all(
      snapshot.docs.map(async (doc) => {
        await doc.ref.delete();
      })
    );

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
    const { id: channelId } = req.params;
    const { isTyping } = req.body;
    const { uid } = res.locals;

    const channel = await getFirestoreData(`Channel/${channelId}`);

    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    if (
      (isTyping && !channel.typing.includes(uid)) ||
      (!isTyping && channel.typing.includes(uid))
    ) {
      await firestore.doc(`Channel/${channelId}`).update({
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
    const { id: channelId } = req.params;
    const { uid } = res.locals;

    const channel = await getFirestoreData(`Channel/${channelId}`);

    if (!channel.members.includes(uid))
      throw new Error("The user is not in the channel.");

    if (
      timeDiff(convertTimestampToDate(channel.lastTypingReset), Date.now()) >=
        30 &&
      channel.typing.length > 0
    ) {
      await firestore.doc(`Channel/${channelId}`).update({
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
  createChannel,
  updateChannel,
  deleteChannel,
  archiveChannel,
  unarchiveChannel,
  addMember,
  deleteMember,
  typingIndicator,
  resetTyping,
};
