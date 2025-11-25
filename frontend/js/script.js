// Đã loại bỏ các biến hardcode (API, Cognito IDs, Region) và thay bằng CONFIG.*

var gridScope;
var descriptionScope;
var filesScope;

function loggedInDisplay() {
    $("#signInButton").addClass("d-none");
    $("#signOutButton").removeClass("d-none");
}

function loggedOutDisplay() {
    $("#signInButton").removeClass("d-none");
    $("#signOutButton").addClass("d-none");
}

function initializeStorage() {
    // ĐÃ SỬA: Lấy thông số từ CONFIG
    var identityPoolId = CONFIG.COGNITO_IDENTITY_POOL_ID; 
    var userPoolId = CONFIG.COGNITO_USER_POOL_ID; 
    var clientId = CONFIG.COGNITO_CLIENT_ID;
    var loginPrefix = 'cognito-idp.' + CONFIG.REGION + '.amazonaws.com/' + userPoolId;

    localStorage.setItem('identityPoolId', identityPoolId);
    localStorage.setItem('userPoolId', userPoolId);
    localStorage.setItem('clientId', clientId);
    localStorage.setItem('loginPrefix', loginPrefix);
}

function updateModalText(descriptionTodo) {
    applyDescriptionScope(descriptionTodo);
    if (descriptionTodo.completed == true) {
        markCompleted();
    } else {
        markNotCompleted();
    }
}

function confirmDeleteTodo(todoID, title) {
    var response = confirm("You are about to delete ~" + title + "~");
    if (response == true) {
        deleteTodo(todoID);
    }
}

function markCompleted() {
    $("#completedButton").addClass("d-none");
    $("#alreadyCompletedButton").removeClass("d-none");
}

function markFileDeleted(fileID) {
    $("#" + fileID).addClass("d-none");
}

function markNotCompleted() {
    $("#completedButton").removeClass("d-none");
    $("#alreadyCompletedButton").addClass("d-none");
}

function showAddFilesForm(){
    $("#addFilesForm").removeClass("d-none");
    $("#fileinput").replaceWith($("#fileinput").val('').clone(true));
} 

function hideAddFilesForm(){
    $("#addFilesForm").addClass("d-none");
    $("#fileinput").replaceWith($("#fileinput").val('').clone(true));
} 

function addFileName () {
    var fileName = document.getElementById('fileinput').files[0].name;
    document.getElementById('fileName').innerHTML = fileName;
}      

function applyGridScope(todosList) {
    // Kiểm tra log để chắc chắn dữ liệu vào đến đây
    console.log("Applying todos to scope:", todosList);
    
    if(gridScope) {
        // Dùng $timeout để ép chạy trong digest cycle tiếp theo (An toàn hơn $apply)
        setTimeout(function() {
            gridScope.$apply(function() {
                gridScope.todos = todosList;
            });
        }, 0);
    } else {
        console.error("gridScope is undefined! Angular controller might not be initialized.");
    }
}

function applyFilesScope(filesList) {
    filesScope.files = filesList;
    filesScope.$apply();
}

function applyDescriptionScope(todo) {
    descriptionScope.descriptionTodo = todo;
    descriptionScope.$apply();
}

function register() {
    event.preventDefault();

    var poolData = {
        // ĐÃ SỬA: Dùng CONFIG
        UserPoolId : CONFIG.COGNITO_USER_POOL_ID,
        ClientId : CONFIG.COGNITO_CLIENT_ID
    };
    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    var attributeList = [];


    var email = document.getElementById('email').value;
    var pw = document.getElementById('pwd').value;
    var confirmPw = document.getElementById('confirmPwd').value;
    var dataEmail = {
        Name : 'email',
        Value : email
    };

    var attributeEmail = new AmazonCognitoIdentity.CognitoUserAttribute(dataEmail);
    attributeList.push(attributeEmail);
    if (pw === confirmPw) {
        userPool.signUp(email, pw, attributeList, null, function(err, result){
            if (err) {
                alert(err.message);
                return;
            }
            cognitoUser = result.user;
            console.log(cognitoUser);
            localStorage.setItem('email', email);
            window.location.replace('confirm.html');
      });
    } else {
        alert('Passwords do not match.')
    };
}

function confirmRegister() {
    event.preventDefault();

    var confirmCode = document.getElementById('confirmCode').value;

    var poolData = {
        // ĐÃ SỬA: Dùng CONFIG
        UserPoolId : CONFIG.COGNITO_USER_POOL_ID,
        ClientId : CONFIG.COGNITO_CLIENT_ID
    };

    var userName = localStorage.getItem('email');

    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    var userData = {
        Username : userName,
        Pool : userPool
    };

    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.confirmRegistration(confirmCode, true, function(err, result) {
        if (err) {
            alert(err.message);
            return;
        }
        window.location.replace("index.html");
    });
}

function login(){
    var userPoolId = localStorage.getItem('userPoolId');
    var clientId = localStorage.getItem('clientId');
    var identityPoolId = localStorage.getItem('identityPoolId');
    var loginPrefix = localStorage.getItem('loginPrefix');

    // ĐÃ SỬA: Dùng CONFIG.REGION
    AWSCognito.config.region = CONFIG.REGION;
    AWSCognito.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: identityPoolId // your identity pool id here
    }); 
    AWSCognito.config.update({accessKeyId: 'anything', secretAccessKey: 'anything'})

    // ĐÃ SỬA: Dùng CONFIG.REGION
    AWS.config.region = CONFIG.REGION; // Region
    AWS.config.credentials = new AWS.CognitoIdentityCredentials({
        IdentityPoolId: identityPoolId
    });

    var poolData = {
        UserPoolId : userPoolId, // Your user pool id here
        ClientId : clientId // Your client id here
    };
    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

    var username = $('#username').val();
    var password = $('#password').val();

    var authenticationData = {
        Username: username,
        Password: password
    };

    var authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);

    var userData = {
        Username : username,
        Pool : userPool
    };
    var cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    console.log(cognitoUser);

    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function (result) {
            var accessToken = result.getAccessToken().getJwtToken();
            console.log('Authentication successful', accessToken);
            var sessionTokens =
            {
                // LƯU Ý: Lưu luôn token vào localStorage để dùng cho hàm gọi API (khác với logic cũ)
                IdToken: result.getIdToken(),
                AccessToken: result.getAccessToken(),
                RefreshToken: result.getRefreshToken()
            };
            localStorage.setItem('sessionTokens', JSON.stringify(sessionTokens))
            localStorage.setItem('userID', username);
            window.location = './home.html';
        },
        onFailure: function(err) {
            console.log('failed to authenticate');
            console.log(JSON.stringify(err));
            alert('Failed to Log in.\nPlease check your credentials.');
        },
    });
}

function checkLogin(redirectOnRec, redirectOnUnrec){
    var userPoolId = localStorage.getItem('userPoolId');
    var clientId = localStorage.getItem('clientId');
    var identityPoolId = localStorage.getItem('identityPoolId');
    var loginPrefix = localStorage.getItem('loginPrefix');

    if (userPoolId != null & clientId != null){
        var poolData = {
        UserPoolId : userPoolId, // Your user pool id here
        ClientId : clientId // Your client id here
        };
        var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        var cognitoUser = userPool.getCurrentUser();

        if (cognitoUser != null) {
            console.log("user exist");
            if (redirectOnRec) {
                window.location = './home.html';
                loggedInDisplay();
            } else {
                $("#body").css({'visibility':'visible'});           
            }
        } else {
            if (redirectOnUnrec) {
                window.location = './index.html';
            } 
        }
    } else{
        window.location = './index.html';
    }
}

function refreshAWSCredentials() {
    var userPoolId = localStorage.getItem('userPoolId');
    var clientId = localStorage.getItem('clientId');
    var identityPoolId = localStorage.getItem('identityPoolId');
    var loginPrefix = localStorage.getItem('loginPrefix');

    var poolData = {
        UserPoolId : userPoolId, // Your user pool id here
        ClientId : clientId // Your client id here
    };
    var userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    var cognitoUser = userPool.getCurrentUser();

    if (cognitoUser != null) {
        cognitoUser.getSession(function(err, result) {
            if (result) {
                console.log('user exist');
                cognitoUser.refreshSession(result.getRefreshToken(), function(err, result) {
                    if (err) {//throw err;
                        console.log('Refresh AWS credentials failed ');
                        alert("You need to log back in");
                        window.location = './index.html';
                    }
                    else{
                        console.log('Logged in user');
                        localStorage.setItem('awsConfig', JSON.stringify(AWS.config));
                        var sessionTokens =
                        {
                            IdToken: result.getIdToken(),
                            AccessToken: result.getAccessToken(),
                            RefreshToken: result.getRefreshToken()
                        };
                        localStorage.setItem("sessionTokens", JSON.stringify(sessionTokens));
                    }
                });
            }
        });
    }
}

function logOut() {
    localStorage.clear();
    document.location.reload();
    window.location = './index.html';
}

function getTodos(callback) {
    try{
        var userID = localStorage.getItem('userID');
        // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
        var todoApi = CONFIG.API_BASE_URL + userID +'/todos';

        var sessionTokensString = localStorage.getItem('sessionTokens');
        var sessionTokens = JSON.parse(sessionTokensString);
        var IdToken = sessionTokens.IdToken;
        var idJwt = IdToken.jwtToken;

        $.ajax({
        url : todoApi,
        type : 'GET',
        headers : {'Authorization' : idJwt },
        success : function(response) {
            console.log("successfully loaded todos for " + userID);
            callback(response.todos);
        },
        error : function(response) {
            console.log("could not retrieve todos list.");
            if (response.status == "401") {
            refreshAWSCredentials();
            }
        }
        });
    }catch(err) {
        alert("You need to be signed in. Redirecting you to the sign in page!");
        loggedOutDisplay();
        console.log(err.message);
    }
}

function getSearchedTodos(filter, callback) {
    try{
        var userID = localStorage.getItem('userID');
        // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
        var todoApi = CONFIG.API_BASE_URL + userID +'/todos?search=' + filter;

        var sessionTokensString = localStorage.getItem('sessionTokens');
        var sessionTokens = JSON.parse(sessionTokensString);
        var IdToken = sessionTokens.IdToken;
        var idJwt = IdToken.jwtToken;

        $.ajax({
        url : todoApi,
        type : 'GET',
        headers : {'Authorization' : idJwt },
        success : function(response) {
            console.log("successfully loaded todos for " + userID);
            callback(response.todos);
        },
        error : function(response) {
            console.log("could not retrieve todos list.");
            if (response.status == "401") {
            refreshAWSCredentials();
            }
        }
        });
    }catch(err) {
        alert("You need to be signed in. Redirecting you to the sign in page!");
        loggedOutDisplay();
        console.log(err.message);
    }
}

function getTodo(todoID, callback) {
    var userID = localStorage.getItem('userID');
    // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
    var todoApi = CONFIG.API_BASE_URL + userID +'/todos/' + todoID;

    var sessionTokensString = localStorage.getItem('sessionTokens');
    var sessionTokens = JSON.parse(sessionTokensString);
    var IdToken = sessionTokens.IdToken;
    var idJwt = IdToken.jwtToken;

    $.ajax({
    url : todoApi,
    type : 'GET',
    headers : {'Authorization' : idJwt },
    success : function(response) {
        console.log('todoID: ' + todoID);
        callback(response.item);
        getTodoFiles(todoID, applyFilesScope);
    },
    error : function(response) {
        console.log("could not retrieve todo.");
        if (response.status == "401") {
        refreshAWSCredentials();
        }
    }
    });
}

function addTodo(dateDue, title, description){
    var userID = localStorage.getItem('userID');
    // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
    var todoApi = CONFIG.API_BASE_URL + userID + "/todos/add";

    var sessionTokensString = localStorage.getItem('sessionTokens');
    var sessionTokens = JSON.parse(sessionTokensString);
    var IdToken = sessionTokens.IdToken;
    var idJwt = IdToken.jwtToken;

    todo = {
        title: title,
        description: description,
        dateDue: dateDue,
    }

    $.ajax({
        url : todoApi,
        type : 'POST',
        headers : {'Content-Type': 'application/json', 'Authorization' : idJwt},
        dataType: 'json',
        data : JSON.stringify(todo),
        success : function(response) {
            console.log("todo added!")
            window.location.reload();
        },
        error : function(response) {
            console.log("could not add todo");
            alert("Could not add todo (x_x)");
            console.log(response);

        }
    });
}

function completeTodo(todoID, callback) {
    try {
        var userID = localStorage.getItem('userID');
        // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
        var todoApi = CONFIG.API_BASE_URL + userID + "/todos/" + todoID + "/complete";

        var sessionTokensString = localStorage.getItem('sessionTokens');
        var sessionTokens = JSON.parse(sessionTokensString);
        var IdToken = sessionTokens.IdToken;
        var idJwt = IdToken.jwtToken;

        $.ajax({
            url : todoApi,
            async : false,
            type : 'POST',
            headers : {'Authorization' : idJwt },
            success : function(response) {
                console.log("marked as completed: " + todoID)
                callback();
            },
            error : function(response) {
            console.log("could not completed todo");
            if (response.status == "401") {
                refreshAWSCredentials();
            }
            }
        });
        } catch(err) {
        alert("You must be logged in");
        console.log(err.message);
        }
}

function deleteTodo(todoID) {
    var userID = localStorage.getItem('userID');
    // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
    var todoApi = CONFIG.API_BASE_URL + userID + '/todos/' + todoID + '/delete';

    var sessionTokensString = localStorage.getItem('sessionTokens');
    var sessionTokens = JSON.parse(sessionTokensString);
    var IdToken = sessionTokens.IdToken;
    var idJwt = IdToken.jwtToken;

    $.ajax({
    url : todoApi,
    type : 'DELETE',
    headers : {'Authorization' : idJwt },
    success : function(response) {
        console.log('deleted todo: ' + todoID);
        location.reload();
    },
    error : function(response) {
        console.log("could not delete todo.");
        if (response.status == "401") {
        refreshAWSCredentials();
        }
    }
    });
}

function addTodoNotes(todoID, notes) {
    try {
        var userID = localStorage.getItem('userID');
        // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
        var todoApi = CONFIG.API_BASE_URL + userID + "/todos/" + todoID + "/addnotes";

        var sessionTokensString = localStorage.getItem('sessionTokens');
        var sessionTokens = JSON.parse(sessionTokensString);
        var IdToken = sessionTokens.IdToken;
        var idJwt = IdToken.jwtToken;

        inputNotes = {
            notes: notes,
        }
        $.ajax({
            url : todoApi,
            type : 'POST',
            headers : {'Content-Type': 'application/json','Authorization' : idJwt },
            dataType: 'json',
            data: JSON.stringify(inputNotes),
            success : function(response) {
                console.log("added notes for: " + todoID)
            },
            error : function(response) {
            console.log("could not add notes");
            if (response.status == "401") {
                refreshAWSCredentials();
            }
            }
        });
        } catch(err) {
        alert("You must be logged in to save notes");
        console.log(err.message);
        }
}

function uploadTodoFileS3(todoID, bucket, filesToUp, callback){
    var userID = localStorage.getItem('userID');
    // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
    var todoFilesApi = CONFIG.API_BASE_URL + todoID + "/files/upload";
    var sessionTokensString = localStorage.getItem('sessionTokens');
    var sessionTokens = JSON.parse(sessionTokensString);
    var IdToken = sessionTokens.IdToken;
    var idJwt = IdToken.jwtToken;
    
    if (!filesToUp.length) {
        alert("You need to choose a file to upload.");   
    }
    else{
        //var fileObj = new FormData();
        var file = filesToUp[0];
        var fileName = file.name;
        //var filePath = userID + '/' + todoID + '/' + fileName;
        //var fileUrl = 'https://' + bucketName + '.s3.amazonaws.com/' +  filePath;
        var fileKey = userID + '/' + todoID + '/' + fileName;
        var sizeInKB = file.size/1024;
        console.log('uploading a file of ' +  sizeInKB)
        if (sizeInKB > 2048) {
            alert("File size exceeds the limit of 2MB.");
        }
        else{
            var params = {
                Key: fileKey,
                Body: file,
                ACL: 'public-read'
            };
            bucket.upload(params, function(err, data) {
                if (err) {
                    console.log(err, err.stack);
                    alert("Failed to upload file " + fileName);
                } else {
                    console.log(fileName + ' successfully uploaded for ' + todoID);
                    var fileObj = {
                        'fileName': fileName,
                        'filePath': fileKey
                    }
                    $.ajax({
                        url : todoFilesApi,
                        type : 'POST',
                        headers : {'Content-Type': 'application/json', 'Authorization' : idJwt },
                        contentType: 'json',
                        data: JSON.stringify(fileObj),
                        success : function(response) {
                            console.log("dynamodb table updated with filePath " + fileName);
                            callback(todoID, applyFilesScope);
                            
                        },
                        error : function(response) {
                            console.log("could not update dynamodb table: " + fileName);
                            if (response.status == "401") {
                                refreshAWSCredentials();
                            }
                        }
                    });
                    hideAddFilesForm();
                }
            })
        } 
    }    
}

function addTodoFiles(todoID, files, callback) {
    // Không cần cấu hình AWS SDK hay Identity Pool ở đây nữa
    try {
        uploadTodoFileS3(todoID, files, callback);
    } catch (err) {
        console.log(err.message);
    }
}

function uploadTodoFileS3(todoID, filesToUp, callback) {
    if (!filesToUp.length) {
        alert("You need to choose a file to upload.");
        return;
    }

    var file = filesToUp[0];
    var fileName = file.name;
    var sizeInKB = file.size / 1024;

    console.log('Uploading file: ' + fileName + ' (' + sizeInKB + ' KB)');

    if (sizeInKB > 2048) {
        alert("File size exceeds the limit of 2MB.");
        return;
    }

    // Lấy Token
    var sessionTokensString = localStorage.getItem('sessionTokens');
    var sessionTokens = JSON.parse(sessionTokensString);
    var idJwt = sessionTokens.IdToken.jwtToken;

    // BƯỚC 1: Gọi API Backend để lấy Presigned URL
    var todoFilesApi = CONFIG.FILES_API_BASE_URL + todoID + "/files/upload";

    $.ajax({
        url: todoFilesApi,
        type: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': idJwt
        },
        data: JSON.stringify({
            'fileName': fileName
        }),
        success: function(response) {
            console.log("Got Presigned URL from Backend");
            var uploadURL = response.uploadURL; // Link để upload (PUT)
            
            // BƯỚC 2: Upload file binary lên S3 bằng link vừa nhận được
            $.ajax({
                url: uploadURL,
                type: 'PUT',
                data: file, // Gửi thẳng file binary
                processData: false, // Bắt buộc: Không xử lý data
                contentType: file.type, // Bắt buộc: Giữ nguyên loại file
                success: function() {
                    console.log("Upload to S3 successful!");
                    // Gọi callback để refresh lại danh sách file
                    callback(todoID, applyFilesScope);
                    hideAddFilesForm();
                },
                error: function(err) {
                    console.log("Error uploading to S3:", err);
                    alert("Failed to upload file content to S3");
                }
            });
        },
        error: function(response) {
            console.log("Could not get upload URL");
            if (response.status == "401") {
                refreshAWSCredentials();
            } else {
                alert("Backend Error: " + JSON.stringify(response));
            }
        }
    });
}

function getTodoFiles(todoID, callback) {
    try{
        // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
        var todoFilesApi = CONFIG.FILES_API_BASE_URL  + todoID + '/files';
        var sessionTokensString = localStorage.getItem('sessionTokens');
        var sessionTokens = JSON.parse(sessionTokensString);
        var IdToken = sessionTokens.IdToken;
        var idJwt = IdToken.jwtToken;

        $.ajax({
        url : todoFilesApi,
        type : 'GET',
        headers : {'Authorization' : idJwt },
        success : function(response) {
            console.log("successfully loaded files for " + todoID);
            callback(response.files);
        },
        error : function(response) {
            console.log("could not retrieve files list");
            if (response.status == "401") {
                refreshAWSCredentials();
            }
        }
        });
    }catch(err) {
        console.log(err.message);
    }
}

function deleteTodoFile(todoID, fileID, filePath, callback) {
    try{
        // ĐÃ SỬA: Dùng CONFIG.API_BASE_URL
        var todoFilesApi = CONFIG.FILES_API_BASE_URL  + todoID + '/files/' + fileID + '/delete' ;
        var sessionTokensString = localStorage.getItem('sessionTokens');
        var sessionTokens = JSON.parse(sessionTokensString);
        var IdToken = sessionTokens.IdToken;
        var idJwt = IdToken.jwtToken;

        body = {
            'filePath': filePath
        };

        $.ajax({
        url : todoFilesApi,
        type : 'DELETE',
        headers : {'Content-Type': 'application/json','Authorization' : idJwt },
        dataType: 'json',
        data: JSON.stringify(body),
        success : function(response) {
            console.log("successfully deleted file " + fileID);
            callback(fileID);
        },
        error : function(response) {
            console.log("could not delete file");
            if (response.status == "401") {
                refreshAWSCredentials();
            }
        }
        });
    }catch(err) {
        console.log(err.message);
    }
}

// chatbot
// ... (Đoạn code Chatbot không cần sửa đổi liên quan đến CONFIG) ...
document.addEventListener('DOMContentLoaded', function() {
    const chatTab = document.querySelector('.chat-tab');
    const chatContainer = document.querySelector('.chat-container');
    const userInput = document.getElementById('userInput');
    
    chatTab.addEventListener('click', function() {
        // Toggle visibility
        chatContainer.style.display = chatContainer.style.display === 'flex' ? 'none' : 'flex';
        userInput.focus(); // Focus on the input field when the chat opens
    });
    
    // Send message on Enter key press, but prevent a newline if the Enter key is pressed
    userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent the default action to avoid form submission or newline
            sendMessage();
        }
    });
});
    
function displayMessage(text, sender = 'user') {
    const chatMessages = document.getElementById('chatMessages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', sender);

    // Set the Bot and the Human icon. Use unicode Emji '&#129302; '; for bot if no images
    //const userIcon = '<img src="path/to/user-icon.png" alt="User" style="width: 20px; height: 20px;"> ';
    const botIcon = '<img src="img/bot-icon.svg" alt="Bot" style="width: 20px; height: 20px;"> ';
    // Choose icon based on sender
    const icon = sender === 'user' ? '&#128100; ' : botIcon; // Human icon for user, robot icon for bot

    // Set the innerHTML to include the icon and text
    // Note: When using innerHTML, ensure your content is safe to prevent XSS vulnerabilities
    messageElement.innerHTML = icon + text;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message
}
    
    
function displayTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    let typingIndicator = document.getElementById('typingIndicator');
    
    // If the typing indicator doesn't already exist, create it.
    if (!typingIndicator) {
        typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'typing');
        typingIndicator.id = 'typingIndicator';
        typingIndicator.textContent = '...';
        chatMessages.appendChild(typingIndicator);
    }
    
    chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to the latest message
}
    
function removeTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}
    
function sendMessage() {
    const userInput = document.getElementById('userInput');
    const message = userInput.value.trim();
    if (message === '') return; // Prevent sending empty messages
    userInput.value = ''; // Clear the input field
    
    displayMessage(message, 'user'); // Display the user message in the chat
    
    displayTypingIndicator(); // Display the typing indicator
    
    try {
      var userID = localStorage.getItem('userID');
      const sessionTokensString = localStorage.getItem('sessionTokens');
      const sessionTokens = JSON.parse(sessionTokensString);
      const IdToken = sessionTokens.IdToken;
      const idJwt = IdToken.jwtToken;
    
      // LƯU Ý: Websocket URL vẫn là hardcode. Nếu cần cấu hình, bạn phải thêm vào config.js
      const websocket = new WebSocket('wss://bum4o4rx48.execute-api.us-east-1.amazonaws.com/production/');
      const payload = {
        action: 'invokeBedrockAgent',
        userID: userID,
        human: message
      };
      console.log("invoking bedrock agent with payload: " + JSON.stringify(payload));

      websocket.onopen = function() {
        websocket.send(JSON.stringify(payload));
      };
    
      websocket.onmessage = function(event) {
        const data = JSON.parse(event.data);
        removeTypingIndicator(); // Remove the typing indicator
        displayMessage(data.response, 'bot'); // Display the bot response
        websocket.close(); // Close the WebSocket connection after receiving the response
      };
    
      websocket.onerror = function(event) {
        console.error('Error:', event);
        removeTypingIndicator(); // Ensure to remove the typing indicator even on error
        displayMessage("Sorry, there was an error. Please try again.", 'bot');
      };
    
      websocket.onclose = function() {
        // WebSocket connection closed
      };
    
    } catch (err) {
      alert("An error occurred. Please try again!");
      console.log(err.message);
    }
}