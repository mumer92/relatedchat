import { ChevronDownIcon } from '@heroicons/react/outline';
import Editor from 'components/dashboard/chat/Editor';
import Messages from 'components/dashboard/chat/Messages';
import EditChannel from 'components/dashboard/channels/EditChannel';
import { UserContext } from 'lib/context';
import { convertTimestampToDate } from 'lib/firebase';
import {
  useChannelById,
  useDetailByChat,
  useDirectMessageById,
  useTheme,
  useUserById,
} from 'lib/hooks';
import React, { useContext, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import styled from 'styled-components';
import { postData } from 'utils/api-helpers';

const SelectChannel = styled.button`
  :hover {
    background-color: ${(props) => props.theme.selectionBackground};
  }
`;

function HeaderChannel() {
  const { themeColors } = useTheme();
  const [open, setOpen] = useState(false);
  const { channelId } = useParams();
  const { value } = useChannelById(channelId);

  return (
    <div className="w-full border-b flex items-center px-5 py-1 h-14 th-color-selbg th-border-selbg">
      <SelectChannel
        className="flex items-center cursor-pointer focus:outline-none py-1 px-2 rounded"
        onClick={() => setOpen(true)}
        theme={themeColors}
      >
        <div className="font-bold text-lg mr-1 th-color-for max-w-sm truncate">
          {`#${value?.name || ''}`}
        </div>
        <ChevronDownIcon className="h-4 w-4 th-color-for" />
      </SelectChannel>
      {value?.topic && (
        <span className="ml-3 text-sm th-color-for opacity-70">
          {value?.topic}
        </span>
      )}
      <EditChannel
        open={open}
        setOpen={setOpen}
        name={value?.name}
        topic={value?.topic}
        details={value?.details}
        createdAt={convertTimestampToDate(value?.createdAt)?.toDateString()}
      />
    </div>
  );
}

function HeaderDirectMessage() {
  const { themeColors } = useTheme();
  const { dmId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { value: dm } = useDirectMessageById(dmId);
  const { user, userdata } = useContext(UserContext);
  const isMe = dm?.members?.length === 1 && dm?.members[0] === user?.uid;
  const otherUserId = dm?.members.find((m: string) => m !== user?.uid);
  const { value } = useUserById(otherUserId || null);

  const photoURL = !isMe
    ? value?.thumbnailURL || value?.photoURL
    : userdata?.thumbnailURL || userdata?.photoURL;

  return (
    <div className="w-full border-b flex items-center justify-between px-5 py-1 h-14 th-color-selbg th-border-selbg">
      <SelectChannel
        className="flex items-center cursor-pointer focus:outline-none py-1 px-2 rounded"
        onClick={() =>
          navigate(
            `${location.pathname.split('/user_profile')[0]}/user_profile/${
              isMe ? user?.uid : value?.objectId
            }`
          )
        }
        theme={themeColors}
      >
        <img
          alt={value?.objectId}
          className="h-6 w-6 rounded mr-2"
          src={photoURL || `${process.env.PUBLIC_URL}/blank_user.png`}
        />
        <div className="font-bold text-lg mr-1 th-color-for max-w-sm truncate">
          {isMe ? userdata?.displayName : value?.displayName}
        </div>
        <ChevronDownIcon className="h-4 w-4 th-color-for" />
      </SelectChannel>
    </div>
  );
}

export default function ChatArea() {
  const { user } = useContext(UserContext);
  const { channelId, dmId } = useParams();
  const { value: channel } = useChannelById(channelId);
  const { value: directMessage } = useDirectMessageById(dmId);
  const { value: detail, loading } = useDetailByChat(channelId || dmId);

  const [lastRead, setLastRead] = useState(null);

  useEffect(() => {
    const el = document.getElementById('messages')!;
    el.scrollTo(el.scrollHeight, 0);
    setLastRead(null);
    setHasNew(false);
  }, [channelId, dmId]);

  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (channel && detail && channel.lastMessageCounter !== detail.lastRead) {
      postData(`/users/${user?.uid}/read`, {
        chatType: 'Channel',
        chatId: channelId,
      });
      if (!hasNew) {
        setLastRead(detail.lastRead);
        setHasNew(true);
      }
    } else if (
      directMessage &&
      detail &&
      directMessage.lastMessageCounter !== detail.lastRead
    ) {
      postData(`/users/${user?.uid}/read`, {
        chatType: 'Direct',
        chatId: dmId,
      });
      if (!hasNew) {
        setLastRead(detail.lastRead);
        setHasNew(true);
      }
    }
  }, [channel?.lastMessageCounter, directMessage?.lastMessageCounter, loading]);

  return (
    <div className="row-span-2 flex flex-col overflow-hidden">
      {channelId && <HeaderChannel />}
      {dmId && <HeaderDirectMessage />}
      <div className="min-h-0 flex-1 flex flex-col justify-end overflow-y-auto">
        <Messages lastRead={lastRead} />
        <Editor />
      </div>
    </div>
  );
}
