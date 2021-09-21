import { Dialog, Transition } from '@headlessui/react';
import { PlusIcon, XIcon } from '@heroicons/react/outline';
import TextField from 'components/TextField';
import ModalButton from 'components/dashboard/ModalButton';
import { Formik } from 'formik';
import { CreateWorkspaceContext, WorkspacesContext } from 'lib/context';
import { useTheme } from 'lib/hooks';
import React, { Fragment, useContext, useRef } from 'react';
import toast from 'react-hot-toast';
import { useNavigate, useParams } from 'react-router-dom';
import { postData } from 'utils/api-helpers';
import classNames from 'utils/classNames';
import wait from 'utils/wait';
import * as Yup from 'yup';

function CreateWorkspace() {
  const { themeColors } = useTheme();
  const cancelButtonRef = useRef(null);
  const { open, setOpen } = useContext(CreateWorkspaceContext);
  const { value: workspaces } = useContext(WorkspacesContext);
  const navigate = useNavigate();
  return (
    <Transition.Root show={open} as={Fragment}>
      <Dialog
        as="div"
        static
        className="fixed z-10 inset-0 overflow-y-auto"
        initialFocus={cancelButtonRef}
        open={open}
        onClose={setOpen}
      >
        <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Dialog.Overlay className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" />
          </Transition.Child>

          {/* This element is to trick the browser into centering the modal contents. */}
          <span
            className="hidden sm:inline-block sm:align-middle sm:h-screen"
            aria-hidden="true"
          >
            &#8203;
          </span>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
              className="inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
              style={{ backgroundColor: themeColors?.background }}
            >
              <div
                style={{ backgroundColor: themeColors?.background }}
                className="px-4 pt-5 pb-4 sm:p-6 sm:pb-4 flex justify-between items-center"
              >
                <h5
                  className="font-bold text-2xl"
                  style={{ color: themeColors?.foreground }}
                >
                  Create workspace
                </h5>
                <div
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer focus:outline-none"
                  onClick={() => setOpen(false)}
                >
                  <XIcon
                    style={{ color: themeColors?.foreground }}
                    className="h-5 w-5"
                  />
                </div>
              </div>
              <Formik
                initialValues={{
                  name: '',
                }}
                validationSchema={Yup.object({
                  name: Yup.string().max(100).required(),
                })}
                enableReinitialize
                onSubmit={async ({ name }, { setSubmitting }) => {
                  setSubmitting(true);
                  try {
                    const { workspaceId, channelId } = await postData(
                      '/workspaces',
                      {
                        name,
                      }
                    );
                    while (
                      workspaces?.find((w: any) => w.objectId === workspaceId)
                    ) {
                      /* eslint-disable-next-line */
                      await wait(1000);
                    }
                    await wait(2000);
                    navigate(
                      `/dashboard/workspaces/${workspaceId}/channels/${channelId}`
                    );
                    setOpen(false);
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                  setSubmitting(false);
                }}
              >
                {({ values, handleChange, isSubmitting, handleSubmit }) => (
                  <form noValidate onSubmit={handleSubmit}>
                    <div
                      className="p-6 pt-0 pb-6"
                      style={{ backgroundColor: themeColors?.background }}
                    >
                      <span
                        className="font-base text-sm"
                        style={{ color: themeColors?.foreground }}
                      >
                        A workspace is made up of channels, where team members
                        can communicate and work together.
                      </span>
                      <div className="space-y-6 pt-5">
                        <TextField
                          label="Name"
                          name="name"
                          focus
                          value={values.name}
                          handleChange={handleChange}
                          placeholder="Workspace name"
                        />
                      </div>
                    </div>
                    <div className="px-4 pb-5 pt-1 sm:px-6 sm:flex sm:flex-row-reverse">
                      <ModalButton text="Create" isSubmitting={isSubmitting} />
                    </div>
                  </form>
                )}
              </Formik>
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition.Root>
  );
}

function WorkspaceItem({
  src,
  objectId,
  channelId,
}: {
  objectId: string;
  channelId: string;
  src: string;
}) {
  const { themeColors } = useTheme();
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const selected = objectId === workspaceId;
  const photoURL = src;
  return (
    <div
      role="button"
      tabIndex={0}
      className={classNames(
        'flex items-center justify-center cursor-pointer focus:outline-none'
      )}
      onClick={() =>
        navigate(`/dashboard/workspaces/${objectId}/channels/${channelId}`)
      }
    >
      <img
        src={photoURL || `${process.env.PUBLIC_URL}/blank_workspace.png`}
        alt="workspace"
        className={classNames(
          selected ? 'border-2' : '',
          'h-10 w-10 rounded-md p-px'
        )}
        style={{ borderColor: selected ? themeColors?.blue : '' }}
      />
    </div>
  );
}

function AddWorkspaces() {
  const { themeColors } = useTheme();
  const { setOpen } = useContext(CreateWorkspaceContext);
  return (
    <div
      role="button"
      tabIndex={0}
      className="flex items-center justify-center focus:outline-none"
      onClick={() => setOpen(true)}
    >
      <div className="flex items-center justify-center cursor-pointer rounded h-10 w-10">
        <PlusIcon
          className="h-8 w-8 p-1"
          style={{ color: themeColors?.foreground }}
        />
      </div>
    </div>
  );
}

export default function Workspaces() {
  const { value } = useContext(WorkspacesContext);
  return (
    <div className="row-span-2 border-r flex flex-col items-center space-y-5 py-5 flex-1 overflow-y-auto th-bg-selbg th-border-bg">
      {value?.map((doc: any) => (
        <WorkspaceItem
          key={doc.objectId}
          objectId={doc.objectId}
          channelId={doc.channelId}
          src={doc.thumbnailURL || doc.photoURL}
        />
      ))}
      <AddWorkspaces />
      <CreateWorkspace />
    </div>
  );
}
