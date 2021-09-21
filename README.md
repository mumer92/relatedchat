
<img src="https://related.chat/relatedchat/headerx.png">

<img src="https://related.chat/relatedchat/pricing.png">

<img src="https://related.chat/relatedchat/product2.png">

# Installation instructions

## Create new Firebase project

1., Go to the [Firebase console](https://console.firebase.google.com)

2., Click on the **_Add project_** section

3., Enter the name of your new Firebase project

4., Customize the unique identifier of your project if necessary

5., Click on **_Continue_**

6., Enable Google Analytics for the project

7., Click on **_Continue_**

8., Choose or create a Google Analytics account

9., Click on **_Create project_**

10., Wait until the project is created

11., Click on **_Continue_**

12., Upgrade the billing plan to **Blaze - Pay as you go** (to have access to all the features)

13., **_Set a budget alert_** to avoid unexpected bills

## Setup the Firebase project

### Authentication

1., Select the **_Authentication_** menu on the sidebar

2., Click on **_Get started_**

3., Click on the the **_Sign-in method_** in the top navigation bar

4., Click on **_Email/Password_** and toggle the first **_Enable_** button

5., Click on **_Save_**

### Firestore Database 

6., Select the **_Firestore Database_** menu on the sidebar

7., Click on **_Create database_**

8., Select the **_Start in production mode_** option

9., Click on **_Next_**

10., Select your Cloud Firestore location

11., Click on **_Enable_**

12., Wait until the database is created

### Storage

13., Your default Storage bucket is created automatically

### Hosting

14., Select the **_Project Overview_** on the top left corner

15., Click on the **_</>_** white circle (next to the iOS and Android options)

16., Enter the App nickname for your Web app

17., Enable the `Also set up Firebase Hosting for this app` option

18., Click on **_Register app_**

19., Save the content of the `firebaseConfig` object (it will be required later, during the setup process)

```
const firebaseConfig = {
  apiKey: "AIzaSyCKxMHj800xVfJPqk2BgBMe7seL5hJv-LU",
  authDomain: "testing-f123f.firebaseapp.com",
  projectId: "testing-f123f",
  storageBucket: "testing-f123f.appspot.com",
  messagingSenderId: "123456789000",
  appId: "1:123456789000:web:4189ac5a701f8687e0ba7a",
  measurementId: "G-VPEZMZES2T"
};
```

20., Click on **_Next_**

21., Click on **_Next_**

22., Click on **_Continue to console_**

## Google Cloud Platform

### Create service account

1., Go to the [Google Cloud Platform Console](https://console.cloud.google.com/iam-admin/serviceaccounts) 

2., Select the **_Service Accounts_** menu on the sidebar

3., Select your recently created Firebase project

4., If the your project does not appear in the recent project list, then click on **_SELECT PROJECT_**, navigate to the **_ALL_** tab, and select your project from the list

5., Click on the **_+ CREATE SERVICE ACCOUNT_**

6., Enter the `github-action-deployment` text as Service account name

7., Enter the `github-action-deployment` text as Service account ID

8., Click on **_CREATE AND CONTINUE_**

9., Select the `Editor` role from the list

10., Click on **_+ ADD ANOTHER ROLE_**

11., Select the `Cloud Functions Admin` role from the list

12., Click on **_CONTINUE_**

13., Click on **_DONE_**

### Download the JSON key file

14., Click on the recently created service account email in the list<br>
`github-action-deployment@{project_id}.iam.gserviceaccount.com`

15., Select the **_KEYS_** in the top navigation bar

16., Click on **_ADD KEY_**

17., Select **_Create new key_**

18., Select the **_JSON_** option

19., Click on **_CREATE_**

20., Private key saved to your computer (it will be required later, during the setup process)

## Setup GitHub repository

1., Create a new, private [GitHub repo](https://github.com/new)

2., Select the **_Settings_** in the top navigation bar

3., Select the **_Secrets_** menu on the sidebar

4., Create the following repository secrets

- `GCP_SA_KEY` -> copy the content of the GCP service account JSON file
- `FIREBASE_API_KEY` -> enter the `apiKey` value of the `firebaseConfig` object
- `FIREBASE_AUTH_DOMAIN` -> enter the `authDomain` value of the `firebaseConfig` object
- `FIREBASE_PROJECT_ID` -> enter the `projectId` value of the `firebaseConfig` object
- `FIREBASE_STORAGE_BUCKET` -> enter the `storageBucket` value of the `firebaseConfig` object
- `FIREBASE_MESSAGING_SENDER_ID` -> enter the `messagingSenderId` value of the `firebaseConfig` object
- `FIREBASE_APP_ID` -> enter the `appId` value of the `firebaseConfig` object
- `FIREBASE_MEASUREMENT_ID` -> enter the `measurementId` value of the `firebaseConfig` object

## Deploy the code to Firebase

1., Push the code to the repo

2., Select the **_Actions_** in the top navigation bar 

3., Wait until the deployment process is finished

4., Your **related:chat** project is now ready to use 🎉🎉🎉

## Final thoughts

You can find the public URL of your Web app in the Firebase Console **_Hosting_** menu. By default Firebase generates two links. Click on one of them to see your live Web app.

You may experience some loading time during the first few minutes, because the Firebase infrastructure needs some time to warm up.

---

© Related Code 2021 - All Rights Reserved