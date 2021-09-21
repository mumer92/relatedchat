import { SearchIcon, TrashIcon, UserAddIcon } from '@heroicons/react/outline';
import AddPeopleToChannelDialog from 'components/dashboard/channels/AddPeopleToChannelDialog';
import Spinner from 'components/Spinner';
import { UserContext } from 'lib/context';
import { firestore } from 'lib/firebase';
import { useChannelById, useWorkspaceById } from 'lib/hooks';
import React, { useContext, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { deleteData } from 'utils/api-helpers';
import classNames from 'utils/classNames';
import compare from 'utils/compare';

function MemberItem({
  id,
  owner,
  member,
  setMembers,
  membersRef,
  setRefresh,
  refresh,
}: {
  id: string;
  owner: boolean;
  member: any;
  setMembers: any;
  membersRef: any;
  setRefresh: any;
  refresh: any;
}) {
  const { channelId, workspaceId } = useParams();
  const { value: workspace } = useWorkspaceById(workspaceId);
  const defaultChannel = channelId === workspace?.channelId;
  const { user } = useContext(UserContext);
  const navigate = useNavigate();
  const photoURL = member?.thumbnailURL || member?.photoURL;

  const [loading, setLoading] = useState(false);

  const deleteMember = async () => {
    setLoading(true);
    try {
      await deleteData(`/channels/${channelId}/members/${id}`);
      const index = membersRef.current.indexOf(member);
      if (index > -1) membersRef.current.splice(index, 1);
      setMembers(membersRef.current);
      setRefresh(refresh + 1);
      if (user?.uid === id) {
        navigate(`/dashboard/workspaces/${workspaceId}`);
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setLoading(false);
  };

  const isMe = id === user?.uid;

  return (
    <li className="px-8 py-2 flex justify-between items-center cursor-pointer group">
      <div
        className={classNames(
          defaultChannel || owner ? '' : 'group-hover:w-5/6',
          'flex items-center w-full'
        )}
      >
        <img
          className="rounded mr-4 h-10 w-10"
          src={photoURL || `${process.env.PUBLIC_URL}/blank_user.png`}
          alt={id}
        />
        <div className="font-bold truncate th-color-for">
          {member?.fullName}
          {isMe && (
            <span className="font-normal opacity-70 ml-1 th-color-for">
              (me)
            </span>
          )}
          {owner && (
            <span className="font-normal opacity-70 ml-1 th-color-for">
              {' '}
              - creator
            </span>
          )}
        </div>
      </div>
      {!defaultChannel && !owner && (
        <div className="opacity-0 group-hover:opacity-100">
          {loading ? (
            <Spinner className="th-color-for" />
          ) : (
            <TrashIcon
              className="h-6 w-6 th-color-red"
              onClick={deleteMember}
            />
          )}
        </div>
      )}
    </li>
  );
}

export default function MembersSection() {
  const [open, setOpen] = useState(false);
  const { channelId } = useParams();
  const { value } = useChannelById(channelId);

  const [search, setSearch] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [members, setMembers] = useState<any>([]);
  const membersRef = useRef<any>([]);

  useEffect(() => {
    if (value?.members) {
      value?.members.forEach((id: string) => {
        firestore.doc(`User/${id}`).onSnapshot((doc) => {
          if (!doc.exists) return;
          const otherMembers = membersRef.current.filter(
            (member: any) => member.objectId !== doc?.data()?.objectId
          );
          membersRef.current = [...otherMembers, doc.data()];
          setMembers(membersRef.current);
        });
      });
    }
  }, [value?.members]);

  const displayMembers = members.reduce((result: any, member: any) => {
    if (
      member?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      member?.displayName?.toLowerCase().includes(search.toLowerCase())
    )
      result.push(member);
    return result.sort(compare);
  }, []);

  return (
    <>
      <div className="px-8 w-full">
        <div className="flex items-center border w-full shadow-sm rounded px-2 th-color-for th-bg-bg th-border-selbg">
          <SearchIcon className="h-5 w-5 th-color-for" />
          <input
            type="text"
            name="findMembers"
            id="findMembers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Find members"
            className="block text-base border-0 w-full focus:outline-none focus:ring-0 th-bg-bg"
          />
        </div>
      </div>
      <ul className="w-full overflow-y-scroll" style={{ height: '460px' }}>
        <li
          className="px-8 py-2 flex items-center cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <div className="rounded p-2 mr-4">
            <UserAddIcon className="h-6 w-6 th-color-for" />
          </div>
          <span className="font-bold th-color-for">Add member</span>
        </li>
        {displayMembers.map((member: any) => (
          <MemberItem
            id={member.objectId}
            key={member.objectId}
            owner={value?.createdBy === member.objectId}
            member={member}
            membersRef={membersRef}
            setMembers={setMembers}
            setRefresh={setRefresh}
            refresh={refresh}
          />
        ))}
      </ul>
      <AddPeopleToChannelDialog open={open} setOpen={setOpen} />
    </>
  );
}
