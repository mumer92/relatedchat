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
  createPersistentDownloadUrlWithMetadata,
  saveImageThumbnail,
} = require("../utils/storage");
const { MESSAGE_THUMBNAIL_WIDTH } = require("../../config");

const lastVisibleMessage = async (chatId) => {
  let lastMessage;
  const snapshot = await firestore
    .collection("Message")
    .where("chatId", "==", chatId)
    .where("isDeleted", "==", false)
    .orderBy("counter", "desc")
    .limit(1)
    .get();
  snapshot.forEach((doc) => {
    lastMessage = doc.data();
  });
  return lastMessage;
};

/**
 * @param  {express.Request} req
 * @param  {express.Response} res
 * @param  {express.NextFunction} next
 */
const createMessage = async (req, res, next) => {
  try {
    const {
      text,
      chatId,
      workspaceId,
      chatType,
      filePath,
      sticker,
      fileName,
      objectId: customObjectId,
    } = req.body;
    const { uid } = res.locals;

    if (!chatId || !workspaceId || !chatType) {
      throw new Error("Arguments are missing.");
    }

    await firestore.runTransaction(async (transaction) => {
      const chat = await getTransactionData(
        transaction,
        `${chatType}/${chatId}`
      );

      if (!chat.members.includes(uid))
        throw new Error("The user is not authorized to create a message.");

      const lastMessageCounter = chat.lastMessageCounter || 0;

      const chatDetails = await getTransactionData(
        transaction,
        `Detail/${sha256(`${uid}#${chatId}`)}`
      );

      const [fileURL, fileDetails] =
        await createPersistentDownloadUrlWithMetadata(filePath);
      const [thumbnailURL, fileMetadata] = await saveImageThumbnail(
        filePath,
        MESSAGE_THUMBNAIL_WIDTH,
        null,
        fileDetails,
        true,
        true
      );

      const messageId = customObjectId || uuidv4();
      transaction.set(firef(`Message/${messageId}`), {
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        text: text || "",
        mediaWidth: (fileMetadata && fileMetadata.width) || null,
        mediaHeight: (fileMetadata && fileMetadata.height) || null,
        mediaDuration: (fileMetadata && fileMetadata.duration) || null,
        fileURL,
        thumbnailURL,
        fileSize: fileDetails ? fileDetails.size : null,
        fileType: fileDetails ? fileDetails.contentType : null,
        fileName: fileName || null,
        sticker: sticker || null,
        objectId: messageId,
        senderId: uid,
        workspaceId,
        chatId,
        chatType,
        counter: lastMessageCounter + 1,
        isDeleted: false,
        isEdited: false,
      });
      transaction.update(firef(`${chatType}/${chatId}`), {
        lastMessageText: text || "",
        lastMessageCounter: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
        ...(chatType === "Direct" && { active: chat.members }),
      });
      if (chatDetails) {
        transaction.update(firef(`Detail/${chatDetails.objectId}`), {
          lastRead: lastMessageCounter + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        const chatDetailsId = sha256(`${uid}#${chatId}`);
        transaction.set(firef(`Detail/${chatDetailsId}`), {
          objectId: chatDetailsId,
          chatId,
          userId: uid,
          workspaceId,
          lastRead: lastMessageCounter + 1,
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
const editMessage = async (req, res, next) => {
  try {
    const { text } = req.body;
    const { id } = req.params;
    const { uid } = res.locals;

    await firestore.runTransaction(async (transaction) => {
      const message = await getTransactionData(transaction, `Message/${id}`);
      const chat = await getTransactionData(
        transaction,
        `${message.chatType}/${message.chatId}`
      );

      if (!chat.members.includes(uid)) {
        throw new Error("The user is not authorized to edit this message.");
      }
      if (message.senderId !== uid) {
        throw new Error("The user is not authorized to edit this message.");
      }

      transaction.update(firef(`Message/${id}`), {
        text,
        updatedAt: FieldValue.serverTimestamp(),
        isEdited: true,
      });

      const lastMessage = await lastVisibleMessage(message.chatId);
      if (lastMessage.counter === message.counter) {
        transaction.update(firef(`${message.chatType}/${message.chatId}`), {
          updatedAt: FieldValue.serverTimestamp(),
          lastMessageText: text,
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
const deleteMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { uid } = res.locals;

    const message = await getFirestoreData(`Message/${id}`);
    const chat = await getFirestoreData(
      `${message.chatType}/${message.chatId}`
    );

    if (!chat.members.includes(uid)) {
      throw new Error("The user is not authorized to delete this message.");
    }
    if (message.senderId !== uid) {
      throw new Error("The user is not authorized to delete this message.");
    }

    await firestore.doc(`Message/${id}`).update({
      isDeleted: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const lastMessage = await lastVisibleMessage(message.chatId);

    if (!lastMessage || lastMessage.text !== chat.lastMessageText) {
      await firestore.doc(`${message.chatType}/${message.chatId}`).update({
        lastMessageText: !lastMessage ? "" : lastMessage.text,
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
  createMessage,
  editMessage,
  deleteMessage,
};
