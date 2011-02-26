searchWatermark = "My goal is to...";

$(function () {
    checkFrequencyVisibility();
    $("#CheckInFrequencyId").change(function () {
        checkFrequencyVisibility();
    });

    $(".enter-key-submit").keyup(function () {
        if (window.event.keyCode == 13) {
            $(this).parents("form")[0].submit();
        }
    });

    // Set watermark
    setWatermark(".master-search-bar", searchWatermark);
    
    $(".remind-me, .remove-reminder").click(function () {
        var goalId = $(".goal-id").val();
        var taskId = $(this).parents(".task-container").find(".task-id").val();
        var link = $(this);
        var isAddReminder = $(this).text() != "Remove commitment";

        $.ajax({
            type: "POST",
            url: "/Goal/" + (isAddReminder ? "addReminder" : "removeReminder"),
            data: "goalId=" + goalId + "&taskId=" + taskId,
            success: function (msg) {
                if (checkAuthentication(msg, link)) {
                    if (isAddReminder) {
                        link.text("Remove commitment");
                        link.removeClass("button");
                    } else {
                        link.html("<span>Commit to it</span>");
                        link.addClass("button");
                    }

                }
            },
            error: function (msg) {
                showAjaxError(elem);
            }
        });

        if ($(".remove-reminder").length == 0) {
            promptForFacebookPost();
        }
    });

    // Voting functionality
    $(".task-vote-up").click(function () {
        var id = $(this).parents(".task-container").find(".task-id").val();
        vote(id, 1, this);
    });

    $(".task-vote-down").click(function () {
        var id = $(this).parents(".task-container").find(".task-id").val();
        vote(id, 0, this);
    });

    // Sign in functionality
    $(".authentication-login").click(function () {
        var dataString = "isAjaxRequest=true&email=" + $("#Email").val() + "&password=" + $("#Password").val();
        var button = $(this);

        $.ajax({
            type: "POST",
            url: "/Authentication/SignIn",
            data: dataString,
            success: function (msg) {
                if (isAuthenticated(msg)) {
                    // show sign in
                    $(".authentication-email").html($("#Email").val());
                    $(".authentication-signin").hide();
                    $(".authentication-status").show();
                }
                else {
                    showMessage("Incorrect email or password.", button);
                }
            },
            error: function (msg) {
                showAjaxError(elem);
            }
        });
    });

    // Covert <a> to buttons
    $("a[title=submit]").click(function () {
        $(this).parents("form").submit();
    });

    // Ask for advice
    $(".ask-for-advice").click(function () {
        $(".no-match").hide(300);
        $(".ask-for-advice-question").show(300);
    });

    // Follow
    $(".goal-follow-button").click(function () {
        var dataString = "goalId=" + $(".goal-id").val();
        var button = $(this);

        $.ajax({
            type: "POST",
            url: "/goal/" + button.html(),
            data: dataString,
            success: function (msg) {
                if (checkAuthentication(msg, button)) {
                    button.html((button.html() == "Follow") ? "Unfollow" : "Follow");
                }
            },
            error: function (msg) {
                showAjaxError(elem);
            }
        });
    });

    $(".activeTasksNext").click(function () {
        loadTasks(1, "active");
    });

    $(".activeTasksPrevious").click(function () {
        loadTasks(-1, "active");
    });

    $(".upcomingTasksNext").click(function () {
        loadTasks(1, "upcoming");
    });

    $(".upcomingTasksPrevious").click(function () {
        loadTasks(-1, "upcoming");
    });

    activateTasks();
});

function checkFrequencyVisibility() {
    if ($("#CheckInFrequencyId").length == 0) {
        return;
    }

    var index = $("#CheckInFrequencyId").get(0).selectedIndex;
    $("#repeats-section").html($($(".repeat-details-area").get(index)).html());
    $(".hours-area #Hour:not(:first)").remove();

    $("#repeats-section #Times").keyup(function () {
        var hoursString = '';
        for (var i = 0; i < parseInt($("#repeats-section #Times").val()); i++) {
            hoursString += (10 + i).toString() + ",";
        }

        if (hoursString.length > 0) {
            hoursString = hoursString.substr(0, hoursString.length - 1);
            setEditReminderHours(hoursString);
        }
    });
}

function loadTasks(pageOffset, typeId) {
    var currentTasksPage = parseInt($("#" + typeId + "-tasks-page").val());
    $("#" + typeId + "-tasks").load("/profile?randomizer=" + new Date().getTime().toString() + "&" + typeId + "TasksPage=" + (currentTasksPage + pageOffset).toString() + " #" + typeId + "-tasks", function () {
        activateTasks();
    });
}

function activateTasks() {
    $("#active-tasks .task-checkbox, #upcoming-tasks .task-checkbox").click(function () {
        var checkbox = $(this);

        $.ajax({
            type: "POST",
            url: "/profile/checkIn?reminderId=" + $(this).val(),
            success: function (msg) {
                checkbox.parents(".task-item").addClass("task-item-complete");
            },
            error: function (msg) {
                showAjaxError(elem);
            }
        });
    });

    $("#active-tasks .task-item, #upcoming-tasks .task-item").each(function () {
        var reminderId = $(this).children(".task-checkbox").val();

        $(this).qtip({
            content: '<span class="reminder-actions"><a href="javascript: void(0)" class="edit-reminder-link" onclick="editTask(\'' + reminderId.toString() + '\')">Edit</a>&nbsp;&nbsp;&#149;&nbsp;&nbsp;<a href="javascript: void(0)" class="skip-it-link" onclick="skipTask(\'' + reminderId.toString() + '\')">Skip It</a></span>',
            style: { tip: true },
            position: {
                corner: {
                    target: 'leftMiddle',
                    tooltip: 'rightMiddle'
                }
            },
            hide: {
                fixed: true
            }
        });
    });
}

function editTask(reminderId) {
    var container = $(".reminder-id-" + reminderId);

    $("#active-tasks .task-item, #upcoming-tasks .task-item").qtip("hide");

    $(".reminder-id").val(reminderId);
      
    var frequencyId = container.children(".frequencyId").val();
    $("#CheckInFrequencyId").val(frequencyId.toString());
    checkFrequencyVisibility();

    var every = container.children(".every").val();
    $("#edit-reminder-content #Every").val(every);

    var times = container.children(".times").val();
    $("#edit-reminder-content #Times").val(times);

    var hour = container.children(".hour-data").val();

    if (hour.indexOf(',') == -1) {
        $("#edit-reminder-content #Hour").val(hour);
    } else {
        setEditReminderHours(hour);
    }

    var days = container.children(".days").val();
    if (days.length != 0) {
        for (var i = 0; i < days.length; i++) {
            $($("#edit-reminder-content #Days").get(i)).attr("checked", (days.charAt(i) == '1' ? true : false));
        }
    }

    var taskTitle = container.children(".name").html();
    $("#edit-reminder-area").dialog({ modal: true, title: "Edit: " + taskTitle, width: 400, resizable: false });
    //$("#edit-reminder-content").load("/profile/editReminder");
}

function skipTask(reminderId) {
    $.ajax({
        type: "POST",
        url: "/profile/skipIt?reminderId=" + reminderId,
        success: function (msg) {
            $("input[value='" + reminderId + "']").parents(".task-item").addClass("task-item-complete");
            $("input[value='" + reminderId + "']").qtip('hide');
        },
        error: function (msg) {
            showAjaxError(elem);
        }
    });
}

function setEditReminderHours(hoursString) {
    var hours = hoursString.split(',');
    var hourClone = $($("#edit-reminder-content #Hour").get(0)).clone();
        
    $("#edit-reminder-content #Hour").remove();

    for (var i = 0; i < hours.length; i++) {
        var clone = hourClone.clone()
        clone.val(hours[i]);
        $(".hours-area").append(clone);
    }
}

function vote(taskId, direction, elem) {
        var dataString = "goalId=" + $(".goal-id").val() + "&taskId=" + taskId + "&direction=" + direction;

        $.ajax({
            type: "POST",
            url: "/goal/voteOnTask/",
            data: dataString,
            success: function (msg) {
                if (checkAuthentication(msg, elem)) {
                    var previousCount = parseInt($(elem).find("span").html());
                    $(elem).find("span").html(++previousCount);
                }
            },
            error: function(msg) {
                showAjaxError(elem);
            }
        }); 
}

function checkAuthentication(msg, elem) {
    if (!isAuthenticated(msg)) {
        showMessage('<p>Please <a href="/authentication/signin?returnUrl=' + escape(window.location) + '" style="font-weight: bold">sign in or register</a> to use this feature.</p>', elem);
        return false;
    }

    return true;
}

function isAuthenticated(msg) {
    return msg.result != "NOAUTH";
}

function showMessage(msg, elem) {
    var tip = $(elem).qtip({
        content: msg,
        show: { ready: true, when: 'click' },
        hide: { when: 'mouseout', fixed: true, delay: 500 },
        style: {
            padding: 5,
            border: {
                width: 7,
                radius: 5,
                color: '#A2D959'
            },
            name: 'green'
        },
        position: {
            corner: {
                target: 'bottomLeft',
                tooltip: 'topLeft'
            },
            adjust: {
                y: 5
            }
        }
    });

    setTimeout(function() { tip.qtip("destroy") }, 10000);
}

function showAjaxError(elem) {
    showMessage('An error occurred. Please try again.', elem);
}

function notify(msg) {
    $(".master-notification p").html(msg);
//    $(".master-notification").show(0, function() {
//            setTimeout(function() {
//                $(".master-notification").hide(500);
//            }, 5000);  
    //    });
//    });
    $(".master-notification").show(0);

}

function setWatermark(watermarkSelector, watermarkValue) {
    var searchString = $(watermarkSelector).val();
    if ($.trim(searchString) == "" || searchString == watermarkValue) {
        $(watermarkSelector).val(watermarkValue);
        $(watermarkSelector).css("color", "#CCC");
    }

    $(watermarkSelector).focus(function () {
        if ($(watermarkSelector).val() == watermarkValue) {
            $(watermarkSelector).val("")
            $(watermarkSelector).css("color", "#666666");
        }
    });

    $(watermarkSelector).blur(function () {
        if ($(watermarkSelector).val() == "") {
            $(watermarkSelector).val(watermarkValue)
            $(watermarkSelector).css("color", "#CCC");
        }
    });
}


function checkLengthOnKeyDown(obj, maxlength) {
    if ($(obj).val().length < maxlength)
        return true;
    else {
        if ((event.keyCode >= 37 && event.keyCode <= 40) || (event.keyCode == 8) || (event.keyCode == 46))
            event.returnValue = true;
        else {
            event.returnValue = false;
        }
    }
}

function checkLengthOnKeyUp(obj, maxlength) {
    if ($(obj).val().length > maxlength) {
        if (!((event.keyCode >= 37 && event.keyCode <= 40) || (event.keyCode == 8) || (event.keyCode == 46))) {
            $(obj).val($(obj).val().substring(0, maxlength));
        }
    }
}