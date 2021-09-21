// eslint-disable-next-line no-unused-vars
const express = require("express");
const {
  firestore,
  FieldValue,
  getTransactionData,
  firef,
  getFirestoreData,
  sha256,
} = require("../utils");
const { v4: uuidv4 } = require("uuid");
const {
  saveImageThumbnail,
  createPersistentDownloadUrlWithMetadata,
} = require("../utils/storage");
const { WORKSPACE_THUMBNAIL_WIDTH } = require("../../config");
const { getUserByEmail } = require("../utils/users");

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createWorkspace = async (req, res, next) => {
  try {
    const { name, objectId: customObjectId } = req.body;
    const { uid } = res.locals;

    const promises = [];
    const workspaceId = customObjectId || uuidv4();
    const channelId = uuidv4();
    const directMessageId = uuidv4();

    promises.push(
      firestore.doc(`Channel/${channelId}`).set({
        objectId: channelId,
        name: "general",
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
        details: "",
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );
    promises.push(
      firestore.doc(`Direct/${directMessageId}`).set({
        objectId: directMessageId,
        members: [uid],
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        active: [uid],
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        lastMessageCounter: 0,
        lastMessageText: "",
      })
    );

    const detailChannelId = sha256(`${uid}#${channelId}`);
    promises.push(
      firestore.doc(`Detail/${detailChannelId}`).set({
        objectId: detailChannelId,
        chatId: channelId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    const detailDmId = sha256(`${uid}#${directMessageId}`);
    promises.push(
      firestore.doc(`Detail/${detailDmId}`).set({
        objectId: detailDmId,
        chatId: directMessageId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    await Promise.all(promises);

    await firestore.doc(`Workspace/${workspaceId}`).set({
      name,
      channelId,
      objectId: workspaceId,
      members: [uid],
      ownerId: uid,
      details: "",
      photoURL: "",
      thumbnailURL: "",
      isDeleted: false,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    res.locals.data = {
      workspaceId,
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
const updateWorkspace = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;
    const { photoPath, name, details } = req.body;

    if (name === "") throw new Error("Name must be provided.");
    if (photoPath && !photoPath.startsWith(`Workspace/${workspaceId}`))
      throw new Error("Not allowed.");

    await firestore.runTransaction(async (transaction) => {
      const workspace = await getTransactionData(
        transaction,
        `Workspace/${workspaceId}`
      );

      if (name && workspace.ownerId !== uid)
        throw new Error("The workspace name can only be renamed by the owner.");

      if (!workspace.members.includes(uid))
        throw new Error("The user is not a member of the workspace.");

      const [photoURL, metadata] =
        await createPersistentDownloadUrlWithMetadata(photoPath);
      const [thumbnailURL] = await saveImageThumbnail(
        photoPath,
        WORKSPACE_THUMBNAIL_WIDTH,
        WORKSPACE_THUMBNAIL_WIDTH,
        metadata
      );

      transaction.update(firef(`Workspace/${workspaceId}`), {
        ...(photoPath != null && { photoURL, thumbnailURL }),
        ...(details != null && { details }),
        ...(name && { name }),
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
const deleteWorkspace = async (req, res, next) => {
  try {
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;

    const workspace = await getFirestoreData(`Workspace/${workspaceId}`);

    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of the workspace.");

    await firestore.doc(`Workspace/${workspaceId}`).update({
      updatedAt: FieldValue.serverTimestamp(),
      isDeleted: true,
    });

    const snapshotDetails = await firestore
      .collection("Detail")
      .where("workspaceId", "==", workspaceId)
      .get();
    await Promise.all(
      snapshotDetails.docs.map(async (doc) => {
        await doc.ref.delete();
      })
    );

    const snapshotChannels = await firestore
      .collection("Channel")
      .where("workspaceId", "==", workspaceId)
      .where("isDeleted", "==", false)
      .get();
    await Promise.all(
      snapshotChannels.docs.map(async (doc) => {
        await doc.ref.update({
          isDeleted: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
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
const addTeammate = async (req, res, next) => {
  try {
    const { email } = req.body;
    const { id: workspaceId } = req.params;
    const { uid } = res.locals;

    const { objectId: teammateId } = await getUserByEmail(email);

    await firestore.runTransaction(async (transaction) => {
      const workspace = await getTransactionData(
        transaction,
        `Workspace/${workspaceId}`
      );
      if (!workspace.members.includes(uid))
        throw new Error("The user is not a member of the workspace.");

      if (workspace.members.includes(teammateId))
        throw new Error(
          "Email is already associated with a user in this workspace."
        );

      const channel = await getTransactionData(
        transaction,
        `Channel/${workspace.channelId}`
      );

      transaction.update(firef(`Workspace/${workspaceId}`), {
        updatedAt: FieldValue.serverTimestamp(),
        members: FieldValue.arrayUnion(teammateId),
      });

      transaction.update(firef(`Channel/${channel.objectId}`), {
        updatedAt: FieldValue.serverTimestamp(),
        members: FieldValue.arrayUnion(teammateId),
      });

      const directMessageId = uuidv4();
      transaction.set(firef(`Direct/${directMessageId}`), {
        objectId: directMessageId,
        members: [uid, teammateId],
        active: [uid],
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        lastMessageCounter: 0,
        lastMessageText: "",
      });

      const selfDirectMessageId = uuidv4();
      transaction.set(firef(`Direct/${selfDirectMessageId}`), {
        objectId: selfDirectMessageId,
        members: [teammateId],
        active: [teammateId],
        typing: [],
        lastTypingReset: FieldValue.serverTimestamp(),
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        lastMessageCounter: 0,
        lastMessageText: "",
      });

      // New teammate chat details with default channel
      const d1 = sha256(`${teammateId}#${channel.objectId}`);
      transaction.set(firef(`Detail/${d1}`), {
        objectId: d1,
        chatId: channel.objectId,
        userId: teammateId,
        lastRead: channel.lastMessageCounter,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });

      // New teammate chat details with me
      const d2 = sha256(`${teammateId}#${directMessageId}`);
      transaction.set(firef(`Detail/${d2}`), {
        objectId: d2,
        chatId: directMessageId,
        userId: teammateId,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });

      // My chat detail with the new teammate
      const d3 = sha256(`${uid}#${directMessageId}`);
      transaction.set(firef(`Detail/${d3}`), {
        objectId: d3,
        chatId: directMessageId,
        userId: uid,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });

      // New teammate chat details with himself
      const d4 = sha256(`${teammateId}#${selfDirectMessageId}`);
      transaction.set(firef(`Detail/${d4}`), {
        objectId: d4,
        chatId: selfDirectMessageId,
        userId: teammateId,
        lastRead: 0,
        workspaceId,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    res.locals.data = {
      succes: true,
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
const deleteTeammate = async (req, res, next) => {
  try {
    const { id: workspaceId, userId } = req.params;
    const { uid } = res.locals;

    const workspace = await getFirestoreData(`Workspace/${workspaceId}`);
    if (!workspace.members.includes(uid))
      throw new Error("The user is not a member of the workspace.");

    await firestore.doc(`Workspace/${workspaceId}`).update({
      members: FieldValue.arrayRemove(userId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const snapshot = await firestore
      .collection("Detail")
      .where("userId", "==", userId)
      .where("workspaceId", "==", workspaceId)
      .get();
    await Promise.all(
      snapshot.docs.map(async (doc) => {
        await doc.ref.delete();
      })
    );

    const snapshot2 = await firestore
      .collection("Direct")
      .where("workspaceId", "==", workspaceId)
      .where("members", "array-contains", userId)
      .orderBy("createdAt", "desc")
      .get();
    await Promise.all(
      snapshot2.docs.map(async (doc) => {
        await doc.ref.delete();
      })
    );

    const snapshot3 = await firestore
      .collection("Channel")
      .where("workspaceId", "==", workspaceId)
      .where("members", "array-contains", userId)
      .get();
    await Promise.all(
      snapshot3.docs.map(async (doc) => {
        await doc.ref.update({
          updatedAt: FieldValue.serverTimestamp(),
          members: FieldValue.arrayRemove(userId),
        });
      })
    );

    res.locals.data = {
      succes: true,
    };
    return next();
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  addTeammate,
  deleteTeammate,
};
