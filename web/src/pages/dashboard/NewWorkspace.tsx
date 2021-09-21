import AuthButton from 'components/authentication/AuthButton';
import TextField from 'components/TextField';
import LoadingScreen from 'components/LoadingScreen';
import { Formik } from 'formik';
import { UserContext, WorkspacesContext } from 'lib/context';
import React, { useContext, useState } from 'react';
import toast from 'react-hot-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { postData } from 'utils/api-helpers';
import * as Yup from 'yup';

function HeaderDefaultWorkspace() {
  const navigate = useNavigate();
  const { userdata } = useContext(UserContext);
  return (
    <header className="w-full py-8 grid grid-cols-3">
      <div />
      <div />
      <div className="flex text-sm flex-col justify-center items-end mr-6">
        <div className="text-gray-500">{userdata?.fullName}</div>
        <button
          onClick={() => {
            navigate('/dashboard/logout');
          }}
          className="font-semibold"
          style={{ color: '#1264a3' }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

export default function NewWorkspace() {
  const { value: workspaces, loading } = useContext(WorkspacesContext);
  const [createWorkspaceLoading, setCreateWorkspaceLoading] = useState(false);

  if (loading) return <LoadingScreen />;

  if (workspaces?.length > 0)
    return (
      <Navigate
        to={`/dashboard/workspaces/${workspaces[0].objectId}/channels/${workspaces[0].channelId}`}
      />
    );

  return (
    <>
      <HeaderDefaultWorkspace />
      <div className="max-w-2xl flex flex-col items-center mx-auto">
        <h1 className="font-extrabold text-5xl mb-2 th-color-for">
          Create workspace
        </h1>
        <Formik
          initialValues={{
            workspaceName: '',
          }}
          validationSchema={Yup.object().shape({
            workspaceName: Yup.string().max(255).required(),
          })}
          onSubmit={async ({ workspaceName }) => {
            setCreateWorkspaceLoading(true);
            try {
              await postData('/workspaces', {
                name: workspaceName,
              });
            } catch (err: any) {
              toast.error(err.message);
            }
          }}
        >
          {({ values, handleChange, handleSubmit }) => (
            <form
              className="max-w-md w-full mt-10"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className="w-full space-y-5">
                <TextField
                  value={values.workspaceName}
                  handleChange={handleChange}
                  label="Workspace name"
                  name="workspaceName"
                  focus
                  placeholder="Workspace name"
                />
                <div className="pt-4">
                  <AuthButton
                    text="Create workspace"
                    isSubmitting={createWorkspaceLoading}
                  />
                </div>
              </div>
            </form>
          )}
        </Formik>
      </div>
    </>
  );
}
