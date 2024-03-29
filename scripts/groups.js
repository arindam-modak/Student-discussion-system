/**
 * Copyright 2015 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';
var array = [];
// Signs-in Friendly Chat.
function signIn() {
  // Sign in Firebase using popup auth and Google as the identity provider.
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider).then(function(result) {
    // This gives you a Google Access Token. You can use it to access the Google API.
    var token = result.credential.accessToken;
    // The signed-in user info.
    var user = result.user;
    var db = firebase.database();
    var ref = db.ref("/user-profiles/");
    array.push("001");
    ref.orderByChild("uid").equalTo(user.uid).once("value",snapshot => {
      if (!snapshot.exists()){ 
          firebase.database().ref('/user-profiles/').push({
            name: user.displayName,
            uid: user.uid,
            memberIn : array,
            profilePicUrl: getProfilePicUrl()
        }).catch(function(error) {
            console.error('Error writing new message to Firebase Database', error);
        });
      }
    });
    // ...
  });
  array=[];
}
// Signs-out of Friendly Chat.
function signOut() {
  // Sign out of Firebase.
  //signInMessageElement.setAttribute('hidden','true');
  firebase.auth().signOut();
  window.location = "http://localhost:5000";
}

// Initiate firebase auth.
function initFirebaseAuth() {
  // Listen to auth state changes.
  //console.log(getUserName());
  firebase.auth().onAuthStateChanged(authStateObserver);
}

// Returns the signed-in user's profile Pic URL.
function getProfilePicUrl() {
  return firebase.auth().currentUser.photoURL || '/images/profile_placeholder.png';
}

// Returns the signed-in user's display name.
function getUserName() {
  return firebase.auth().currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return !!firebase.auth().currentUser;
}

// Loads chat messages history and listens for upcoming ones.
function loadMessages() {
  // Loads the last 12 messages and listen for new ones.
  var callback = function(snap) {
    var data = snap.val();
    displayMessage(snap.key, data.name, data.text, data.profilePicUrl, data.imageUrl);
  };
  firebase.database().ref('/messages/').limitToLast(12).on('child_added', callback);
  firebase.database().ref('/messages/').limitToLast(12).on('child_changed', callback);
}

function loadUserList() {
  // Loads the last 12 messages and listen for new ones.
  var callback = function(snap) {
    var data = snap.val();
    displayUserList(snap.key , data.uid , data.name, data.profilePicUrl , data.imageUrl);
  };
  firebase.database().ref('/user-profiles/').on('child_added', callback);
  firebase.database().ref('/user-profiles/').on('child_changed', callback);
}

function loadGroupMessages(groupId) {
  activeGrouId = groupId;
  var myNode = groupMessageListElement;
  while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
  }
  var callback = function(snap) {
    var data = snap.val();
    displayGroupMessage(snap.key, data.name, data.text, data.profilePicUrl, data.imageUrl);
  };
  firebase.database().ref('/groups/'+groupId+'/messages/').limitToLast(12).on('child_added', callback);
  firebase.database().ref('/groups/'+groupId+'/messages/').limitToLast(12).on('child_changed', callback);
}





function loadGroupList(){
  var temp2=[];
  console.log(firebase.auth().currentUser.uid);
    

  firebase.database().ref().child("/user-profiles/").orderByChild("uid").equalTo(firebase.auth().currentUser.uid).on("value", snap=>{
    if (snap.exists()){ 
          snap.forEach(function(childSnapshot) {
                  //console.log(childSnapshot.val().memberIn);
            temp2 = childSnapshot.val().memberIn;
            console.log(temp2);
          });
      }
  });
  const sleep = (milliseconds) => {
      return new Promise(resolve => setTimeout(resolve, milliseconds))
    }
  sleep(10000).then(() => {
      console.log(temp2);
      for(var i=0;i<temp2.length;i++) {
        var gname;
        if(temp2[i]) {

          firebase.database().ref("/groups/"+temp2[i]).on("value", snap=>{
          if (snap.exists()){ 

                gname = snap.val().group_name;
                displayGroupList(snap.key,gname);
            }
          });  
          
        }
      }
  })

  



}





// Saves a new message on the Firebase DB.
function saveMessage(messageText) {
  // Add a new message entry to the Firebase database.
  return firebase.database().ref('/messages/').push({
    name: getUserName(),
    text: messageText,
    profilePicUrl: getProfilePicUrl()
  }).catch(function(error) {
    console.error('Error writing new message to Firebase Database', error);
  });
}

// Saves a new message containing an image in Firebase.
// This first saves the image in Firebase storage.
function saveImageMessage(file) {
  // 1 - We add a message with a loading icon that will get updated with the shared image.
  firebase.database().ref('/messages/').push({
    name: getUserName(),
    imageUrl: LOADING_IMAGE_URL,
    profilePicUrl: getProfilePicUrl()
  }).then(function(messageRef) {
    // 2 - Upload the image to Cloud Storage.
    var filePath = firebase.auth().currentUser.uid + '/' + messageRef.key + '/' + file.name;
    return firebase.storage().ref(filePath).put(file).then(function(fileSnapshot) {
      // 3 - Generate a public URL for the file.
      return fileSnapshot.ref.getDownloadURL().then((url) => {
        // 4 - Update the chat message placeholder with the image’s URL.
        return messageRef.update({
          imageUrl: url,
          storageUri: fileSnapshot.metadata.fullPath
        });
      });
    });
  }).catch(function(error) {
    console.error('There was an error uploading a file to Cloud Storage:', error);
  });
}








// Saves a new message on the Firebase DB.
function groupsaveMessage(messageText,groupId) {
  // Add a new message entry to the Firebase database.
  return firebase.database().ref('/groups/'+groupId+'/messages').push({
            uid: firebase.auth().currentUser.uid,
            name: getUserName(),
            text: messageText,
            profilePicUrl: getProfilePicUrl(),
            date: new Date().toLocaleString()
        }).catch(function(error) {
    console.error('Error writing new message to Firebase Database', error);
  });
}

// Saves a new message containing an image in Firebase.
// This first saves the image in Firebase storage.
function groupsaveImageMessage(file,groupId) {
  // 1 - We add a message with a loading icon that will get updated with the shared image.
  firebase.database().ref('/groups/'+groupId+'/messages').push({
    uid: firebase.auth().currentUser.uid,
    name: getUserName(),
    imageUrl: LOADING_IMAGE_URL,
    profilePicUrl: getProfilePicUrl(),
    date: new Date().toLocaleString()
  }).then(function(messageRef) {
    // 2 - Upload the image to Cloud Storage.
    var filePath = firebase.auth().currentUser.uid + '/' + messageRef.key + '/' + file.name;
    return firebase.storage().ref(filePath).put(file).then(function(fileSnapshot) {
      // 3 - Generate a public URL for the file.
      return fileSnapshot.ref.getDownloadURL().then((url) => {
        // 4 - Update the chat message placeholder with the image’s URL.
        return messageRef.update({
          imageUrl: url,
          storageUri: fileSnapshot.metadata.fullPath
        });
      });
    });
  }).catch(function(error) {
    console.error('There was an error uploading a file to Cloud Storage:', error);
  });
}












// Saves the messaging device token to the datastore.
function saveMessagingDeviceToken() {
  firebase.messaging().getToken().then(function(currentToken) {
    if (currentToken) {
      console.log('Got FCM device token:', currentToken);
      // Saving the Device Token to the datastore.
      firebase.database().ref('/fcmTokens').child(currentToken)
          .set(firebase.auth().currentUser.uid);
    } else {
      // Need to request permissions to show notifications.
      requestNotificationsPermissions();
    }
  }).catch(function(error){
    console.error('Unable to get messaging token.', error);
  });
}

// Requests permissions to show notifications.
function requestNotificationsPermissions() {
  console.log('Requesting notifications permission...');
  firebase.messaging().requestPermission().then(function() {
    // Notification permission granted.
    saveMessagingDeviceToken();
  }).catch(function(error) {
    console.error('Unable to get permission to notify.', error);
  });
}

// Triggered when a file is selected via the media picker.
function onMediaFileSelected(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  imageFormElement.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {
    saveImageMessage(file);
  }
}

// Triggered when the send new message form is submitted.
function onMessageFormSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputElement.value && checkSignedInWithMessage()) {
    saveMessage(messageInputElement.value).then(function() {
      // Clear message text field and re-enable the SEND button.
      resetMaterialTextfield(messageInputElement);
      toggleButton();
    });
  }
}
function sendMe(){
  window.location = "http://localhost:5000/user2.html";
}
// Triggers when the auth state change for instance when the user signs-in or signs-out.
function authStateObserver(user) {
  if (user) { // User is signed in!
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getProfilePicUrl();
    var userName = getUserName();
    /*var db = firebase.database();
    var ref = db.ref("/user-profiles/");
    //console.log(currentUserID);
    var key;
    ref.orderByChild("uid").equalTo(firebase.auth().currentUser.uid).once("value",snapshot => {
          //console.log("No");
          //var data = snapshot.val();
          snapshot.forEach(function(childSnapshot) {
            //console.log(childSnapshot.key);
            var data = childSnapshot.val();
            if(data.roll){
              rollElement.setAttribute('value',data.roll);
              semElement.setAttribute('value',data.semester);
              departElement.setAttribute('value',data.depart);
              mobileElement.setAttribute('value',data.mobile);
            }
          });
    });*/
    //currentUserID = firebase.auth().currentUser.uid;
    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage = 'url(' + profilePicUrl + ')';
    userNameElement.textContent = userName;
    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');
    //signInMessageElement.removeAttribute('hidden');
    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');
    var currUid=firebase.auth().currentUser.uid;
    firebase.database().ref('/notifiactions/').orderByChild('uid').equalTo(currUid).once('value',snap=>{
      if(snap.exists()){
        
        snap.forEach(function(childSnapshot){
            if(childSnapshot.exists()){
              if(childSnapshot.val().is_seen=="No"){
                document.getElementById('notification').style.color='red';
              }
            }

        });


      }

      loadGroupList();
    });
    //nameElement.setAttribute('value',userName);
    //profPicElement.setAttribute('src',profilePicUrl);
    //emailElement.setAttribute('value',userEmail);
    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();

  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
  }
}

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  // Return true if the user is signed in Firebase
  if (isUserSignedIn()) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}

// Template for messages.
var MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';

var USER_LIST_TEMPLATE =
    '<div class="user-list-container">' +
      '<div class="user-spacing"><div class="user-pic"></div></div>' +
      '<div class="user-href"><div class="user-name"></div></div>' +
    '</div>';

var SEARCHED_USER_LIST_TEMPLATE = 
    '<div class="user-list-container">' +
      '<div class="user-spacing"><div class="user-pic"></div></div>' +
      '<div class="user-href"><div class="user-name"></div><button id="x" class="x">x</button></div>' +
    '</div>';

var GROUP_LIST_TEMPLATE =
    '<div style="margin-top:1%; width: 100%; padding: 15px;box-sizing: border-box;background-color: lightblue;" class="group-list-container">'+
      '<div class="group-spacing"></div>' +
      '<div class="group-href"><div style="weight=bold;" class="group-name"></div></div>' +
    '</div>';
// A loading image URL.
var LOADING_IMAGE_URL = 'https://www.google.com/images/spin-32.gif?a';

// Displays a Message in the UI.


function displayMessage(key, name, text, picUrl, imageUrl) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    messageListElement.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUrl) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      messageListElement.scrollTop = messageListElement.scrollHeight;
    });
    image.src = imageUrl + '&' + new Date().getTime();
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  messageListElement.scrollTop = messageListElement.scrollHeight;
  messageInputElement.focus();
}
var group_array=[];

function removeMember(uid,name,div){
  //console.log(group_array);
  membersListElement.removeChild(div);
  /*for(var i=0;i<group_array.length;i++){
    if(group_array[i]==uid){
      group_array.slice(i,1);
    }
  }*/
  group_array = group_array.filter(item => item !== uid)

  //console.log(group_array);
}

function addGroupMember(uid,name,picUrl) {
  group_array.push(uid);
  
  //console.log(group_array);


  var div = document.getElementById(uid);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = SEARCHED_USER_LIST_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', "A"+uid);
    membersListElement.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.user-pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.user-name').textContent = name;
  div.querySelector('.x').addEventListener('click',function(){  removeMember(uid,name,div);  });
  //div.querySelector('.user-name').addEventListener('click', function(){ addGroupMember(uid,name); });

  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  membersListElement.scrollTop = membersListElement.scrollHeight;
}

function formGroup(){

  var temp = group_array;
  var gid = firebase.database().ref('/groups/').push({
          group_name: document.getElementById('group-name').value ,
          members: group_array,
          //admin : user.uid,
          date_form: new Date().toLocaleString()
  }).key;
  //var name2= "Group"+count;
  var db = firebase.database();
    var ref = db.ref("/user-profiles/");
    var i=0;
    //console.log(temp);
    for(i=0;i<temp.length;i++){
      var temp2=[];
      //console.log(temp[i]);
      var keyy;
      ref.orderByChild("uid").equalTo(temp[i]).on("value",snapshot => {
        if (snapshot.exists()){ 

          snapshot.forEach(function(childSnapshot) {
            console.log(childSnapshot.val());
            keyy = childSnapshot.key;
            //console.log(childSnapshot.val().memberIn);
            if(childSnapshot.val().memberIn)
            temp2 = childSnapshot.val().memberIn;
            //console.log(temp2);
          });
          temp2.push(gid);
          console.log(temp2);
        }

      });
      const sleep = (milliseconds) => {
          return new Promise(resolve => setTimeout(resolve, milliseconds))
      }
      sleep(5000).then(() => {
          console.log(temp2);
      firebase.database().ref().child("/user-profiles/"+keyy).update({memberIn : temp2}); })
      
    } 
    group_array=[];

} 

function displaySearchedUserList(key,uid,name,picUrl){
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = USER_LIST_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    searchNamesList.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.user-pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.user-name').textContent = name;
  div.querySelector('.user-href').setAttribute('id', "heha_"+name);
  div.querySelector('.user-name').addEventListener('click', function(){ addGroupMember(uid,name,picUrl); });

  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  searchNamesList.scrollTop = searchNamesList.scrollHeight;
  //group_array=[];
 // messageInputElement.focus();
}
/*function displayUserList(key, uid, name, picUrl, imageUrl) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = USER_LIST_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    UserListElement.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.user-pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.user-name').textContent = name;
  div.querySelector('.user-href').setAttribute('id', "heha_"+name);
  div.querySelector('.user-name').addEventListener('click', function(){ addGroupMember(uid,name); });

  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  UserListElement.scrollTop = messageListElement.scrollHeight;
  messageInputElement.focus();
}*/
function showChat(groupId,groupName){
    window.location = "http://localhost:5000/showChat.html"+"?groupID="+groupId+"&group_Name="+groupName; 

}

function displayGroupList(groupId,groupName){
  var div = document.getElementById(groupId);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = GROUP_LIST_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', "Z"+groupId);
    membersListElement.appendChild(div);
  }
  div.querySelector('.group-name').textContent = groupName;
  div.querySelector('.group-href').setAttribute('id', "heha_"+groupName);
  div.querySelector('.group-name').addEventListener('mouseover', function(){
    div.style.opacity = 0.6;
  });
  div.querySelector('.group-name').addEventListener('mouseout', function(){
    div.style.opacity = 1.0;
  });
  div.querySelector('.group-name').addEventListener('click',function(){ showChat(groupId,groupName);  });
  //div.querySelector('.x').addEventListener('click',function(){  removeMember(uid,name,div);  });
  //div.querySelector('.user-name').addEventListener('click', function(){ addGroupMember(uid,name); });

  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  membersListElement.scrollTop = membersListElement.scrollHeight;

}


function displayGroupMessage(key, name, text, picUrl, imageUrl) {
  var div = document.getElementById(key);
  // If an element for that message does not exists yet we create it.
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = MESSAGE_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', key);
    groupMessageListElement.appendChild(div);
  }
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + picUrl + ')';
  }
  div.querySelector('.name').textContent = name;
  var groupMessageElement = div.querySelector('.message');
  if (text) { // If the message is text.
    groupMessageElement.textContent = text;
    // Replace all line breaks by <br>.
    groupMessageElement.innerHTML = groupMessageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUrl) { // If the message is an image.
    var image = document.createElement('img');
    image.addEventListener('load', function() {
      groupMessageListElement.scrollTop = groupMessageListElement.scrollHeight;
    });
    image.src = imageUrl + '&' + new Date().getTime();
    groupMessageElement.innerHTML = '';
    groupMessageElement.appendChild(image);
  }
  // Show the card fading-in and scroll to view the new message.
  setTimeout(function() {div.classList.add('visible')}, 1);
  groupMessageListElement.scrollTop = groupMessageListElement.scrollHeight;
  groupMessageInputElement.focus();
}







function onGroupMediaFileSelected(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  groupImageFormElement.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {
    groupsaveImageMessage(file,activeGrouId);
  }
}

// Triggered when the send new message form is submitted.
function onGroupMessageFormSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (groupMessageInputElement.value && checkSignedInWithMessage()) {
    groupsaveMessage(groupMessageInputElement.value,activeGrouId).then(function() {
      // Clear message text field and re-enable the SEND button.
      resetMaterialTextfield(groupMessageInputElement);
      groupToggleButton();
    });
  }
}









function groupToggleButton() {
  if (groupMessageInputElement.value) {
    groupSubmitButtonElement.removeAttribute('disabled');
  } else {
    groupSubmitButtonElement.setAttribute('disabled', 'true');
  }
}

// Enables or disables the submit button depending on the values of the input
// fields.
function toggleButton() {
  if (messageInputElement.value) {
    submitButtonElement.removeAttribute('disabled');
  } else {
    submitButtonElement.setAttribute('disabled', 'true');
  }
}

function search_names() {
  var input = searchElement.value;
  //console.log(input);
  var myNode = searchNamesList;
  while (myNode.firstChild) {
      myNode.removeChild(myNode.firstChild);
  }
  var callback = function(snap) {
    var data = snap.val();
    var list = [];
    var list=data.name;
    //console.log(list);
    if(list.substring(0,input.length)==input && input!=""){
      displaySearchedUserList(snap.key , data.uid , data.name, data.profilePicUrl);
    }
    /*for (var i=0;i<list.length;i++){
      if(list[i].substring(0,input.length)==input){
        console.log(list[i]);
      }
    }*/
    //displaySearchNames(snap.key, data.name, data.text, data.profilePicUrl, data.imageUrl);
  };
  firebase.database().ref().child('/user-profiles/').orderByChild('name').startAt(input).on('child_added', callback);
  firebase.database().ref().child('/user-profiles/').orderByChild('name').startAt(input).on('child_changed', callback)
}

// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
}

// Checks that Firebase has been imported.
checkSetup();

// Shortcuts to DOM Elements.
//var signInMessageElement = document.getElementById('msg');
var userPicElement = document.getElementById('user-pic');
var userNameElement = document.getElementById('user-name');
var signInButtonElement = document.getElementById('sign-in');
var signOutButtonElement = document.getElementById('sign-out');
userPicElement.addEventListener('click',sendMe);
userNameElement.addEventListener('click',sendMe); 
// Saves message on form submit.
var membersListElement = document.getElementById('members');
var showChatElement = document.getElementById('show-chat');
//showChatElement.addEventListener('click',showChat);
signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);
// initialize Firebase
initFirebaseAuth();

// We load currently existing chat messages and listen to new ones.
//loadMessages();
//loadUserList();
//loadGroupList();
//console.log(getUserName());