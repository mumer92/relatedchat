import { DocumentTextIcon, DownloadIcon } from '@heroicons/react/outline';
import { PencilIcon, TrashIcon } from '@heroicons/react/solid';
import EditMessage from 'components/dashboard/chat/EditMessage';
import QuillReader from 'components/dashboard/quill/QuillReader';
import Spinner from 'components/Spinner';
import { UserContext } from 'lib/context';
import { convertTimestampToDate } from 'lib/firebase';
import { useTheme, useUserById } from 'lib/hooks';
import React, { useContext, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { deleteData } from 'utils/api-helpers';
import bytesToSize from 'utils/bytesToSize';
import classNames from 'utils/classNames';
import hexToRgbA from 'utils/hexToRgbA';

const MessageDiv = styled.div`
  :hover {
    background-color: ${(props) =>
      hexToRgbA(props.theme.selectionBackground, '0.4')};
  }
`;

export default function Message({
  message,
  previousSameSender,
  previousMessageDate,
  children,
}: {
  message: any;
  previousSameSender: boolean;
  previousMessageDate: any;
  children: React.ReactNode;
}) {
  const messageReader = useMemo(
    () => <QuillReader text={message?.text} isEdited={message?.isEdited} />,
    [message]
  );

  const { themeColors } = useTheme();
  const { user } = useContext(UserContext);
  const downloadRef = useRef<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { value } = useUserById(message?.senderId);

  const photoURL = value?.thumbnailURL || value?.photoURL;
  const fileURL = message?.thumbnailURL || message?.fileURL;

  const [edit, setEdit] = useState(false);

  const [loadingDelete, setLoadingDelete] = useState(false);

  const deleteMessage = async () => {
    setLoadingDelete(true);
    try {
      await deleteData(`/messages/${message?.objectId}`);
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoadingDelete(false);
  };

  const prevCreatedAt = convertTimestampToDate(previousMessageDate);
  const createdAt = convertTimestampToDate(message?.createdAt);
  const displayProfilePicture =
    !previousSameSender ||
    (previousSameSender &&
      prevCreatedAt &&
      createdAt &&
      createdAt?.getTime() - prevCreatedAt?.getTime() > 600000);

  const messageRender = useMemo(
    () => (
      <>
        {displayProfilePicture && (
          <div className="flex flex-col items-start h-full pt-1 w-10">
            <div
              role="button"
              tabIndex={0}
              className="rounded h-10 w-10 bg-cover cursor-pointer focus:outline-none"
              style={{
                backgroundImage: `url(${
                  photoURL || `${process.env.PUBLIC_URL}/blank_user.png`
                })`,
              }}
              onClick={() =>
                navigate(
                  `${
                    location.pathname.split('/user_profile')[0]
                  }/user_profile/${value?.objectId}`
                )
              }
            />
          </div>
        )}
        {!displayProfilePicture && (
          <div className="flex flex-col items-start h-full pt-1 w-10 opacity-0 group-hover:opacity-100">
            <span className="font-light text-xs ml-2 align-bottom th-color-for">
              {convertTimestampToDate(message?.createdAt)
                ?.toLocaleTimeString()
                .replace(/:\d+ /, ' ')
                .slice(0, -3)}
            </span>
          </div>
        )}
        <div className="flex flex-col pl-3 w-full">
          {displayProfilePicture && (
            <div className="flex items-center">
              <span
                role="button"
                tabIndex={0}
                className="font-extrabold text-base align-top hover:underline cursor-pointer focus:outline-none max-w-sm truncate"
                onClick={() =>
                  navigate(
                    `${
                      location.pathname.split('/user_profile')[0]
                    }/user_profile/${value?.objectId}`
                  )
                }
                style={{
                  color: edit ? themeColors?.black : themeColors?.foreground,
                }}
              >
                {value?.displayName}
              </span>
              <span
                className="font-light text-xs ml-2 align-bottom"
                style={{
                  color: edit ? themeColors?.black : themeColors?.foreground,
                }}
              >
                {convertTimestampToDate(message?.createdAt)
                  ?.toLocaleTimeString()
                  .replace(/:\d+ /, ' ')
                  .slice(0, -3)}
              </span>
            </div>
          )}
          {message?.text && !edit && messageReader}
          {message?.text && edit && (
            <EditMessage setEdit={setEdit} message={message} />
          )}
          {message.fileURL && !edit && (
            <>
              {message?.fileType?.includes('image/') && (
                <div className="relative my-1">
                  <img
                    className="bg-cover max-w-sm max-h-sm rounded relative focus:outline-none cursor-pointer"
                    alt={message?.fileName}
                    src={fileURL}
                    onClick={() => downloadRef?.current?.click()}
                  />
                </div>
              )}
              {message?.fileType?.includes('video/') && (
                <div className="max-h-sm max-w-sm relative my-1">
                  <video
                    className="max-h-sm max-w-sm"
                    controls
                    disablePictureInPicture
                    controlsList="nodownload"
                    poster={message?.thumbnailURL}
                  >
                    <source src={message?.fileURL} type={message?.fileType} />
                  </video>
                </div>
              )}
              {message?.fileType?.includes('audio/') && (
                <div className="relative my-1">
                  <audio controls controlsList="nodownload">
                    <source src={fileURL} type={message?.fileType} />
                  </audio>
                </div>
              )}
              {!message?.fileType?.includes('audio/') &&
                !message?.fileType?.includes('video/') &&
                !message?.fileType?.includes('image/') && (
                  <div className="relative my-1">
                    <div className="rounded h-16 w-80 relative group bg-gray-800 border border-gray-600 flex space-x-2 items-center p-1 overflow-hidden">
                      <DocumentTextIcon className="h-9 w-9 text-blue-500 flex-shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <div className="text-gray-300 text-sm font-bold truncate">
                          {message?.fileName}
                        </div>
                        <div className="text-gray-400 text-sm truncate">
                          {bytesToSize(message?.fileSize)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
            </>
          )}
          {message?.sticker && (
            <img
              className="h-32 w-32 my-2 rounded-sm"
              alt={message?.sticker}
              src={`${process.env.PUBLIC_URL}/stickers/${message?.sticker}`}
            />
          )}
        </div>
        <div
          className={classNames(
            edit ? 'opacity-0' : 'opacity-0 group-hover:opacity-100',
            'absolute top-0 right-0 mx-5 transform -translate-y-3 z-20 inline-flex shadow-sm rounded-md -space-x-px'
          )}
        >
          {message?.fileURL && (
            <button
              type="button"
              className={classNames(
                message?.senderId !== user?.uid ? 'rounded-r-md' : '',
                'th-bg-bg th-border-selbg th-color-for relative inline-flex items-center px-3 py-1 rounded-l-md border text-sm font-medium focus:z-10 focus:outline-none'
              )}
              onClick={() => downloadRef?.current?.click()}
            >
              <span className="sr-only">Download</span>
              <a
                ref={downloadRef}
                className="hidden"
                download
                target="_blank"
                rel="noreferrer"
                href={message?.fileURL}
              >
                Download
              </a>
              <DownloadIcon className="h-4 w-4" />
            </button>
          )}
          {message?.text && message?.senderId === user?.uid && (
            <button
              type="button"
              className={classNames(
                message?.fileURL ? '' : 'rounded-l-md',
                'th-bg-bg th-border-selbg th-color-for relative inline-flex items-center px-3 py-1 border text-sm font-medium focus:z-10 focus:outline-none'
              )}
              onClick={() => setEdit(true)}
            >
              <span className="sr-only">Edit</span>
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {message?.senderId === user?.uid && (
            <button
              type="button"
              className={classNames(
                !message?.text && !message?.fileURL
                  ? 'rounded-md'
                  : 'rounded-r-md',
                'th-bg-bg th-border-selbg th-color-for relative inline-flex items-center px-3 py-1 border text-sm font-mediumfocus:z-10 focus:outline-none'
              )}
              onClick={deleteMessage}
            >
              <span className="sr-only">Delete</span>
              {loadingDelete ? (
                <Spinner className="h-4 w-4 th-color-for" />
              ) : (
                <TrashIcon className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </>
    ),
    [
      photoURL,
      fileURL,
      message,
      value?.objectId,
      value?.displayName,
      edit,
      loadingDelete,
    ]
  );

  return (
    <div className="w-full first:mb-4 last:mt-4">
      {children}
      <MessageDiv
        theme={themeColors}
        className={classNames(
          edit ? 'py-2' : 'py-1',
          'px-5 w-full flex items-start group relative'
        )}
        style={{
          backgroundColor: edit ? hexToRgbA(themeColors?.yellow, '0.7')! : '',
        }}
      >
        {messageRender}
      </MessageDiv>
    </div>
  );
}
