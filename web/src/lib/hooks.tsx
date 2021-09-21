import { MESSAGES_PER_PAGE } from 'config';
import {
  ChannelsContext,
  DetailsContext,
  DirectMessagesContext,
  EditPasswordContext,
  MessagesContext,
  ThemeContext,
  UserContext,
  UsersAllContext,
  WorkspacesContext,
} from 'lib/context';
import { auth, convertTimestampToDate, firestore } from 'lib/firebase';
import { useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import {
  useCollectionData,
  useDocumentData,
} from 'react-firebase-hooks/firestore';
import { useLocation } from 'react-router-dom';

export function useTheme() {
  return useContext(ThemeContext);
}

export function useEditPasswordModal() {
  return useContext(EditPasswordContext);
}

export function useCreateMessageModal() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<'channels' | 'members'>('channels');
  return { open, setOpen, section, setSection };
}

export function useCreateChannelModal() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function useInviteTeammatesModal() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function usePreferencesModal() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function useWorkspaceSettingsModal() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<'members' | 'settings'>('members');
  return { open, setOpen, section, setSection };
}

export function useCreateWorkspaceModal() {
  const [open, setOpen] = useState(false);
  return { open, setOpen };
}

export function useUserData() {
  const [user, loading] = useAuthState(auth);
  const [value] = useDocumentData(
    user ? firestore.doc(`User/${user.uid}`) : null
  );

  if (loading) return { user: undefined, userdata: undefined };
  return { user, userdata: { ...value, isPresent: true } };
}

export function useWorkspaces() {
  const { user } = useContext(UserContext);

  const [value, loading] = useCollectionData(
    user
      ? firestore
          .collection('Workspace')
          .where('members', 'array-contains', user?.uid)
          .where('isDeleted', '==', false)
          .orderBy('createdAt', 'desc')
      : null
  );

  return { value, loading };
}

export function useWorkspaceById(id: string) {
  const { value } = useContext(WorkspacesContext);

  const [workspace, setWorkspace] = useState<any>(null);

  useEffect(() => {
    if (!value?.length) return;
    setWorkspace(value.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: workspace };
}

export function useChannelsByWorkspace() {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const id = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];
  const [channels, setChannels] = useState<any[]>([]);
  const [value, loading] = useCollectionData(
    user && id
      ? firestore
          .collection('Channel')
          .where('workspaceId', '==', id)
          .where('members', 'array-contains', user?.uid)
          .where('isDeleted', '==', false)
          .where('isArchived', '==', false)
          .orderBy('name', 'asc')
      : null
  );

  useEffect(() => {
    if (value) {
      const temp = channels.filter((data: any) => data.w !== id);
      setChannels([...temp, { w: id, data: value }]);
    }
  }, [value]);

  return { value: channels.find((data: any) => data.w === id)?.data, loading };
}

export function useChannelById(id: string) {
  const { value } = useContext(ChannelsContext);

  const [channel, setChannel] = useState<any>(null);

  useEffect(() => {
    if (!value?.length) return;
    setChannel(value.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: channel };
}

export function useDirectMessagesByWorkspace() {
  const { user } = useContext(UserContext);
  const location = useLocation();
  const id = location.pathname
    .split('/dashboard/workspaces/')[1]
    ?.split('/')[0];
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [value, loading] = useCollectionData(
    user && id
      ? firestore
          .collection('Direct')
          .where('active', 'array-contains', user?.uid)
          .where('workspaceId', '==', id)
          .orderBy('createdAt', 'desc')
      : null
  );

  useEffect(() => {
    if (value) {
      const temp = directMessages.filter((data: any) => data.w !== id);
      setDirectMessages([...temp, { w: id, data: value }]);
    }
  }, [value]);

  return {
    value: directMessages.find((data: any) => data.w === id)?.data,
    loading,
  };
}

export function useDirectMessageById(id: string) {
  const { value } = useContext(DirectMessagesContext);

  const [directMessage, setDirectMessage] = useState<any>(null);

  useEffect(() => {
    if (!value?.length) return;
    setDirectMessage(value.find((p: any) => p.objectId === id));
  }, [value, id]);

  return { value: directMessage };
}

export function useMessagesByChat(
  id: string,
  type: 'Channel' | 'Direct',
  page = 1
) {
  const { messages, setMessages } = useContext(MessagesContext);

  const [value, loading] = useCollectionData(
    id
      ? firestore
          .collection('Message')
          .where('chatType', '==', type)
          .where('chatId', '==', id)
          .where('isDeleted', '==', false)
          .orderBy('createdAt', 'desc')
          .limit(page * MESSAGES_PER_PAGE)
      : null
  );

  useEffect(() => {
    if (value) {
      const temp = messages.filter((data: any) => data.c !== id);
      setMessages([...temp, { c: id, data: value }]);
    }
  }, [value]);

  return { value: messages.find((data: any) => data.c === id)?.data, loading };
}

export function useUsersAll() {
  const [users, setUsers] = useState<any[]>([]);
  return { users, setUsers };
}

function timeDiff(date1: Date | null, date2: number) {
  return date1 ? Math.abs(date1.getTime() - date2) / 1000 : false;
}

export function useUserById(id: string | null | undefined, presence = false) {
  const { user } = useContext(UserContext);
  const { users, setUsers } = useContext(UsersAllContext);
  const currentUser = users.find((data: any) => data.objectId === id);

  const [value, loading] = useDocumentData(
    id ? firestore.doc(`User/${id}`) : null
  );

  const [currentTime, setCurrentTime] = useState(Date.now());

  // eslint-disable-next-line
  useEffect(() => {
    if (presence) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 3000);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    if (value) {
      const temp = users.filter((data: any) => data.objectId !== id);
      setUsers([...temp, value]);
    }
  }, [value]);

  return {
    value: currentUser
      ? {
          ...currentUser,
          // eslint-disable-next-line
          isPresent: !currentUser.lastPresence
            ? false
            : user?.uid === id
            ? true
            : timeDiff(
                convertTimestampToDate(currentUser.lastPresence),
                currentTime
              ) < 35,
        }
      : undefined,
    loading,
  };
}

export function useDetails() {
  const [details, setDetails] = useState<any[]>([]);
  return { details, setDetails };
}

export function useDetailByChat(id: string | null | undefined) {
  const { user } = useContext(UserContext);
  const { details, setDetails } = useContext(DetailsContext);
  const currentDetail = details.find((data: any) => data.chatId === id);

  const [value, loading] = useCollectionData(
    id && user?.uid
      ? firestore
          .collection('Detail')
          .where('chatId', '==', id)
          .where('userId', '==', user?.uid)
          .limit(1)
      : null
  );

  useEffect(() => {
    if (value?.length) {
      const temp = details.filter((data: any) => data.chatId !== id);
      setDetails([...temp, value[0]]);
    }
  }, [value]);

  return { value: currentDetail, loading };
}

export function useForceUpdate() {
  const [value, setValue] = useState(0);
  return () => setValue(value + 1);
}
