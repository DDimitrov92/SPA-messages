function startApp() {
    sessionStorage.clear();
    showHideMenuLinks();
    showView('viewAppHome');

    $("#linkMenuAppHome").click(showHomeView);
    $("#linkMenuLogin").click(showLoginView);
    $("#linkMenuRegister").click(showRegisterView);
    $("#linkMenuUserHome").click(showUserHomeView);
    $("#linkMenuMyMessages").click(showUserMessagesView);
    $("#linkMenuArchiveSent").click(archiveMessages);
    $("#linkMenuSendMessage").click(showSendMessages);
    $("#linkMenuLogout").click(logoutUser);

    $("#linkUserHomeArchiveSent").click(archiveMessages);
    $("#linkUserHomeMyMessages").click(showUserMessagesView);
    $("#linkUserHomeSendMessage").click(showSendMessages);

    const kinveyBaseUrl = "https://baas.kinvey.com/";
    const kinveyAppKey = "kid_B1lETdqQl";
    const kinveyAppSecret = "584e654979bd42048f4f60793fc0c532";
    const kinveyAppAuthHeaders = {'Authorization': "Basic " + btoa(kinveyAppKey + ":" + kinveyAppSecret)};

    $("#buttonLoginUser").click(loginUser);
    $("#buttonRegisterUser").click(registerUser);
    $("#sendMessage").click(sendMessage);

    $("#infoBox, #errorBox").click(function () {
        $(this).fadeOut();
    });

    $(document).on({
        ajaxStart: function () {
            $("#loadingBox").show()
        },
        ajaxStop: function () {
            $("#loadingBox").hide()
        }
    });

    $("#loadingBox,#infoBox,#errorBox").hide();
    $("#spanMenuLoggedInUser").hide();


    function showHideMenuLinks() {
        $("#menu a").hide();
        if (sessionStorage.getItem("username")) {
            $("#linkMenuUserHome").show();
            $("#linkMenuMyMessages").show();
            $("#linkMenuSendMessage").show();
            $("#linkMenuArchiveSent").show();
            $("#linkMenuLogout").show();
        }
        else {
            $("#linkMenuAppHome").show();
            $("#linkMenuLogin").show();
            $("#linkMenuRegister").show();
        }

    }

    function getKinveyUserAuthHeaders() {
        return {
            "Authorization": "Kinvey " + sessionStorage.getItem("authtoken")
        }

    }

    function showView(viewName) {
        $('main > section').hide();
        $('#' + viewName).show();
    }

    function showHomeView() {
        showView("viewAppHome")
    }

    function showLoginView() {
        showView("viewLogin");
        $("#formLogin").trigger('reset');
    }

    function showRegisterView() {
        showView("viewRegister");
        $("#formLogin").trigger('reset');
    }

    function showUserHomeView() {
        showView("viewUserHome");
        $("#viewUserHomeHeading").text("Welcome, " + sessionStorage.getItem('username') + "!");
    }

    function showUserMessagesView() {
        $("#myMessages").empty();
        showView("viewMyMessages");
        $("#sendMessage").trigger('reset');

        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/messages",
            headers: getKinveyUserAuthHeaders(),
            success: getMessagesSuccess,
            error: handleAjaxError
        });
        function getMessagesSuccess(messages) {
            let table = $(`
                    <table>
                    <thead>
                        <tr>
                            <th>From</th>
                            <th>Message</th>
                            <th>Date Received</th>
                        </tr>
                    </thead>
                    </table>
                    `);
            for (let message of messages) {
                if (message.recipient_username == sessionStorage.getItem('username')) {
                    let tr = $('<tr>');
                    displayRow(tr, message)
                    tr.appendTo(table);
                }
            }
            $('#myMessages').append(table);
        }

    }

    function displayRow(tr, message) {
        tr.append(
            $("<td>").text(formatSender(message.sender_name, message.sender_username)),
            $("<td>").text(message.text),
            $("<td>").text(formatDate(message._kmd.lmt))
        )
    }

    function formatDate(dateISO8601) {
        let date = new Date(dateISO8601);
        if (Number.isNaN(date.getDate()))
            return '';
        return date.getDate() + '.' + padZeros(date.getMonth() + 1) +
            "." + date.getFullYear() + ' ' + date.getHours() + ':' +
            padZeros(date.getMinutes()) + ':' + padZeros(date.getSeconds());

        function padZeros(num) {
            return ('0' + num).slice(-2);
        }
    }

    function formatSender(name, username) {
        if (!name)
            return username;
        else
            return username + ' (' + name + ')';
    }


    function archiveMessages() {
        $("#sentMessages").empty();
        showView("viewArchiveSent");

        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/messages",
            headers: getKinveyUserAuthHeaders(),
            success: getArchiveSuccess,
            error: handleAjaxError
        });

        function getArchiveSuccess(messages) {
            let table = $(`
                    <table>
                    <thead>
                        <tr>
                            <th>To</th>
                            <th>Message</th>
                            <th>Date Sent</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    </table>
                    `);
            for (let message of messages) {
                if (message.recipient_username == sessionStorage.getItem('username')) {
                    let tr = $('<tr>');
                    displayArchiveRow(tr, message)
                    tr.appendTo(table);
                }
            }
            $('#sentMessages').append(table);
        }
    }

    function displayArchiveRow(tr, message) {
        let btn = $('<button>');
        btn.text("Delete")
        tr.append(
            $("<td>").text(message.recipient_username),
            $("<td>").text(message.text),
            $("<td>").text(formatDate(message._kmd.lmt)),
            $("<td>").append(btn)
        )
    }

    function showSendMessages() {
        $("#msgRecipientUsername").empty();
        showView("viewSendMessage");

        $.ajax({
            method: "GET",
            url: kinveyBaseUrl + "user/" + kinveyAppKey,
            headers: getKinveyUserAuthHeaders(),
            success: getAllUsersSuccess,
            error: handleAjaxError
        });

        function getAllUsersSuccess(users) {
            let menu = $("#msgRecipientUsername");
            let count = 1;
            for (let user of users) {
                menu.append($('<option>', {
                        text: user.username
                    }
                ));
                count++;
            }
        }
    }

    function sendMessage() {
        let msgData = {
            sender_username: sessionStorage.getItem("username"),
            sender_name: sessionStorage.getItem("name"),
            recipient_username: $("#msgRecipientUsername").text(),
            text: $('#msgText').val()
        };

        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "appdata/" + kinveyAppKey + "/messages",
            headers: getKinveyUserAuthHeaders(),
            data: msgData,
            success: sendMessageSucces,
            error: handleAjaxError
        });
        function sendMessageSucces() {
            showInfo("Message sent.");
            archiveMessages();
        }
    }

    function logoutUser() {
        sessionStorage.clear();
        showHideMenuLinks();
        showView('viewAppHome');
        showInfo('Logout successful.');
    }


    function loginUser() {
        let userData = {
            username: $('#loginUsername').val(),
            password: $('#loginPasswd').val()
        };
        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + "/login",
            headers: kinveyAppAuthHeaders,
            data: userData,
            success: loginSuccess,
            error: handleAjaxError
        });

        function loginSuccess(userInfo) {
            saveAuthInSession(userInfo);
            showHideMenuLinks();
            showInfo("Login successful!");
            showView("viewUserHome")
        }
    }

    function showInfo(message) {
        $('#infoBox').text(message);
        $('#infoBox').show();
        setTimeout(function () {
            $('#infoBox').fadeOut();
        }, 3000);
    }

    function registerUser() {
        let userData = {
            username: $('#registerUsername').val(),
            password: $('#registerPasswd').val(),
            name: $('#registerName').val()
        };
        $.ajax({
            method: "POST",
            url: kinveyBaseUrl + "user/" + kinveyAppKey + "/",
            headers: kinveyAppAuthHeaders,
            data: userData,
            success: registerSuccess,
            error: handleAjaxError

        });

        function registerSuccess(userInfo) {
            saveAuthInSession(userInfo);
            showHideMenuLinks();
            //listBooks();
            showInfo('User registration successful.');

        }
    }

    function saveAuthInSession(userInfo) {
        sessionStorage.setItem('username', userInfo.username);
        sessionStorage.setItem('authtoken', userInfo._kmd.authtoken);
        sessionStorage.setItem('name', userInfo.name);
        $("#spanMenuLoggedInUser").text("Hello, " + userInfo.username).show();
    }

    function showError(errorMsg) {
        $('#errorBox').text("Error: " + errorMsg);
        $('#errorBox').show();
    }

    function handleAjaxError(response) {
        let errorMsg = JSON.stringify(response);
        if (response.readyState === 0)
            errorMsg = "Cannot connect due to network error.";
        if (response.responseJSON &&
            response.responseJSON.description)
            errorMsg = response.responseJSON.description;
        showError(errorMsg);

    }

    }