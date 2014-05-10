// ==UserScript==
// @name        Mod Button
// @namespace   http://www.reddit.com/r/toolbox
// @author      agentlame, creesch, LowSociety
// @description Universal moderator action button.
// @include     http://www.reddit.com/*
// @include     http://reddit.com/*
// @include     http://*.reddit.com/*
// @downloadURL http://userscripts.org/scripts/source/167236.user.js
// @version     1.13
// ==/UserScript==
 
function modButtonWrapper() {


var modButton = new Toolbox.TBModule('Mod Button', '0.1');
modButton.setting('enabled', true);

modButton.run = function () {
    // do it differently on the about mod page.
    if (Toolbox.utils.isEditUserPage) {
        $('span.user').each(function () {
            $(this).find('a:first').after('<span> - <a href="javascript:;" class="global-mod-button">' + modButton.buttonName + '</a></span>');
        });

        return;
    }

    // Not a mod, don't bother.
    if (Toolbox.utils.mySubs.length < 1) {
        return;
    }

    var things = $('div.thing .entry:not(.mod-button)');
    Toolbox.utils.forEachChunked(things, 15, 500, function (thing) { modButton.processThing(thing); });
};

// Add mod button to all users
modButton.processThing = function (thing) {
    if (!$(thing).hasClass('mod-button')) {
        // Add the class so we don't add buttons twice.
        $(thing).addClass('mod-button');
        console.log(this);
        // Defer info gathering until button is clicked.
        $(thing).find('.buttons li:last').before('<li><a href="javascript:;" class="global-mod-button">' + this.buttonName + '</a></li>');
    }
}

/**
 *  updates the current savedsubs' listings in the mod button
 */
modButton.updateSavedSubs = function () {
    //
    // Refresh the settings tab and role tab sub dropdowns and saved subs tabls
    //
    var $table = $('body').find('.mod-popup').find('tbody'),
        currentsub = $('#subreddit').text();

    // clear out the current stuff
    $('.add-dropdown').find('option').remove();
    $('.remove-dropdown').find('option').remove();
    $table.html('');


    // add the current sub to the saved subs table on the role tab.
    if (currentsub) {
        $table.append('<tr><th><input type="checkbox" class="action-sub" name="action-sub" value="' + currentsub +
            '" id="action-' + currentsub + '" checked><label for="action-' + currentsub + '">&nbsp;&nbsp;/r/' + currentsub +
            ' (current)</label></th></tr>');
    }

    // add our saved subs to the "remove saved subs" dropdown on the setting tab
    // and to the saved subs table on the role tab
    $.each(this.savedSubs, function (i, subreddit) {
        // so something funny is going on, because we have to use valueOf() here otherwise it inexplicably fails
        if (subreddit != currentsub && ($.inArray(subreddit, Toolbox.utils.mySubs) != -1)) {
            $table.append('<tr><th><input type="checkbox" class="action-sub" name="action-sub" value="' + this +
                '" id="action-' + this + '"><label for="action-' + this + '">&nbsp;&nbsp;/r/' + this + '</label></th></tr>');
        }
        $('.remove-dropdown')
            .append($('<option>', {
                    value: this
                })
                .text('/r/' + this));
    });

    // insert the "other-sub" dropdown
    // TODO: make this dropdown add to a list of other subreddits to action on,
    //       like a single-use version of the modbuton "saved subreddit" feature
    $table.append('<tr><th><input type="checkbox" class="action-sub" name="action-sub" id="' + this.OTHER + '-checkbox" value="' + this.OTHER + '">\
                               <select class="' + this.OTHER + '" for="action-' + this.OTHER + '"><option value="' + this.OTHER + '">(select subreddit)</option></select></th></tr>');
    
    // repopulate the "add sub" and "other-sub" dropdowns with all the subs we mod
    $.each(Toolbox.utils.mySubs, function (i, subreddit) {
        $('.add-dropdown')
            .append($('<option>', {
                    value: subreddit
                })
                .text('/r/' + subreddit));
        $('.' + this.OTHER)
            .append($('<option>', {
                    value: subreddit
                })
                .text('/r/' + subreddit));
    });
}



modButton.init = function() { 
    this.buttonName = 'mod',
    this.saveButton = 'Save',
    this.cancelButton = 'Close';
     
    this.OTHER = 'other-sub',
    this.BANREASON = "(ban reason)",
    this.savedSubs = []; 

    this.settings_defaults['sublist'] = [];
    this.savedSubs = this.setting('sublist');

    Toolbox.utils.getModSubs(function () {
        modButton.savedSubs = Toolbox.utils.saneSort(modButton.savedSubs);
        modButton.run();
    });
 
    // this is normally set in notifier.js, which is Not Good™.
    $('body').addClass('mod-toolbox');
 
    // RES NER support.
    $('div.content').on('DOMNodeInserted', function (e) {
        if (e.target.parentNode.id && e.target.parentNode.id === 'siteTable' && e.target.className.match(/sitetable/)) {
            modButton.run();
        }
 
        // Fixes expanding bug in mod mail.
        if ($(e.target).hasClass('clearleft')) {
            setTimeout(function () {
                modButton.run();
            }, 1000);
        }
    });
 
    // Mod button clicked
    $('body').delegate('.global-mod-button', 'click', function (event) {
        var benbutton = event.target; //huehuehue
        $(benbutton).text('loading...');
 
        var display = (modButton.savedSubs.length < 1) ? 'none' : '',
            showglobal = modButton.setting('globalbutton', false),
            info = Toolbox.utils.getThingInfo(this, true),
            currentsub = info.subreddit,
            user = info.user,
            id = info.id;
 
        if (!user) {
            $(benbutton).text('error');
            $(benbutton).css('color', 'red');
            return;
        }
 
        // generate the .mod-popup jQuery object
        var popup = $('\
                <div class="mod-popup">\
                    <div class="mod-popup-header">\
                        <label class="action-title"> Mod Actions  - /u/'+  user +'</label>\
                        <span class="close right"><a href="javascript:;">✕</a></span>\
                    </div>\
                    <div class="mod-popup-tabs">\
                        <a href="javascript:;" title="Add or remove user from subreddit ban, contributor, and moderator lists." class="user-role active">Role</a>\
                        <a href="javascript:;" title="Edit user flair" class="edit-user-flair">User Flair</a>\
                        <!--a href="javascript:;" title="Nuke chain" class="nuke-comment-chain">Nuke Chain</a-->\
                        <a href="javascript:;" title="Settings" class="edit-modbutton-settings right">Settings</a>\
                    </div>\
                    <label id="user" style="display:none">' + user + '</label> \
                    <label id="subreddit" style="display:none">' + currentsub + '</label>\
                    <label id="id" style="display:none">' + id + '</label>\
                    <div class="mod-popup-tab-role">\
                        <div class="mod-popup-content">\
                            <table><tbody class="subs-body" />\
                            </table>\
                            <input id="ban-note" class="ban-note" type="text" value="' + modButton.BANREASON + '"></input></p>\
                        </div>\
                        \
                        <div class="mod-popup-footer">\
                            <select class="mod-action">\
                                <option class="mod-action-negative" data-action="banned" data-api="friend">ban</option> \
                                <option class="mod-action-positive" data-action="banned" data-api="unfriend">unban</option> \
                                <option class="mod-action-positive" data-action="contributor" data-api="friend">approve</option> \
                                <option class="mod-action-negative" data-action="contributor" data-api="unfriend" >unapprove</option> \
                                <option class="mod-action-positive" data-action="moderator" data-api="friend">mod</option> \
                                <option class="mod-action-negative" data-action="moderator" data-api="unfriend" >demod</option> \
                            </select>\
                            <button class="save">' + modButton.saveButton + '</button>\
                            <button title="Global Action (perform action on all subs)" class="global-button"' + (showglobal ? '' : 'style="display:none;"') + ';">Global Action</button>\
                        </div>\
                    </div>\
                    \
                    <div class="mod-popup-tab-flair" style="display:none;">\
                        <div class="mod-popup-content">\
                            <p style="clear:both;">Text:&nbsp;&nbsp;<input id="flair-text" class="flair-text" type="text"></input></p>\
                            <p style="clear:both;">Class:&nbsp;<input id="flair-class" class="flair-class" type="text"></input></p>\
                        </div>\
                        <div class="mod-popup-footer">\
                             <button class="flair-save">Save</button>\
                        </div>\
                    </div>\
                    \
                    <div class="mod-popup-tab-settings" style="display:none;">\
                        <div class="mod-popup-content">\
                            <div class="edit-subreddits">\
                                <select class="remove-dropdown left"></select><button class="remove-save right">remove</button>\
                                <select class="add-dropdown left"></select><button class="add-save right">add</button>\
                                <p style="clear:both">\
                                    <label class="global-label" for="the-nuclear-option">\
                                        <input class="the-nuclear-option" type="checkbox" id="the-nuclear-option" name="the-nuclear-option">\
                                        &nbsp;enable Global Action button.\
                                    </label>\
                                </p>\
                            </div>\
                        </div>\
                        <div class="mod-popup-footer">\
                            <button class="settingSave">Save</button>\
                        </div>\
                    </div>\
                    <div><span class="status error left">saving...</span></div>\
                  <div>\
                <div>')
            .appendTo('body')
            .css({
                left: event.pageX - 50,
                top: event.pageY - 10,
                display: 'block'
            });
 
        // Remove options that only apply to subs we mod
        if (!currentsub) {
            // Hide the flair tab
            // TODO: add a "disabled" state, with tooltip, and use that instead
            // We can only edit flair in the current sub.
            popup.find('.edit-user-flair').remove();

            // We can oly nuke comments in subs we mod.
            popup.find('.nuke-comment-chain').remove();
        }
 
        if (Toolbox.utils.isModmail || Toolbox.utils.isModpage) {
            // Nothing to nuke in mod mail or on mod pages.
            popup.find('.nuke-comment-chain').remove();
        }

        // Show if current user is banned, and why. - thanks /u/LowSociety
        $.get("http://www.reddit.com/r/" + currentsub + "/about/banned/.json", { user : user }, function (data) {
            var banned = data.data.children;
            for (var i = 0; i < banned.length; i++) {
                if (banned[i].name.toLowerCase() == user.toLowerCase()) {
                    popup.find("select.mod-action option[data-api=unfriend][data-action=banned]").attr("selected", "selected");
                    $("#ban-note").val(banned[i].note);
                    $('.action-title').css('color', 'red');
                    break;
                }
            }
            return;
        });

        // if we're on the mod page, it's likely we want to mod them to another sub.
        // unselect current, change action to 'mod'.
        if (location.pathname.match(/\/about\/(?:moderator)\/?/)) {
            popup.find("select.mod-action option[data-api=friend][data-action=moderator]").attr("selected", "selected");
            $('.ban-note').hide();
            $('.action-sub:checkbox:checked').removeAttr('checked');
        } else if (location.pathname.match(/\/about\/(?:contributors)\/?/)) {
            popup.find("select.mod-action option[data-api=friend][data-action=contributor]").attr("selected", "selected");
            $('.ban-note').hide();
            $('.action-sub:checkbox:checked').removeAttr('checked');
        }
 
        // render the saved subs lists
        modButton.updateSavedSubs();
  
        // custom sub changed.
        $('.' + modButton.OTHER).change(function () {
            $('#' + modButton.OTHER + '-checkbox').prop('checked', ($(this).val() !== modButton.OTHER));
        });
 
        // show/hide ban reason text feild.
        $('.mod-action').change(function () {
            var banNote = $('.ban-note');
            if ($(this).val() == 'ban') {
                $(banNote).show();
            } else {
                $(banNote).hide();
            }
            $(banNote).val(modButton.BANREASON);
        });
 
        // removal reason focus.
        $('.ban-note').focus(function () {
            if ($(this).val() == modButton.BANREASON) {
                $(this).val('');
            }
        });
 
        $('.ban-note').focusout(function () {
            if ($(this).val() === '') {
                $(this).val(modButton.BANREASON);
            }
        });
 
        // reset button name.
        $(benbutton).text(modButton.buttonName);
 
        return false;
    });
 
    // 'save' button clicked...  THIS IS WHERE WE BAN PEOPLE, PEOPLE!
    $('body').delegate('.mod-popup .save, .global-button', 'click', function () {
 
        var button = $(this),
            popup = button.parents('.mod-popup'),
            selected = popup.find('.mod-action :selected'),
            api = selected.attr('data-api'),
            action = selected.attr('data-action'),
            actionName = selected.val(),
            status = popup.find('.status').show(),
            banReason = popup.find('.ban-note').val(),
            subreddits = [],
            user = popup.find('#user').text(),
            actionCount = 0;
 
        if (!$(this).hasClass('global-button')) {
 
            // Get dem ban subs.
            popup.find('.action-sub:checkbox:checked').each(function () {
                if ($(this).val() !== modButton.OTHER) {
                    subreddits.push($(this).val());
                } else {
                    var subname = $('.' + modButton.OTHER + ' option:selected').val();
                    if (subname !== modButton.OTHER) {
                        subreddits.push(subname);
                    }
                }
            });
 
        } else {
            var confirmban = confirm("This will " + actionName + " /u/" + user + " from every subreddit you moderate.   Are you sure?");
            if (confirmban) {
                subreddits = Toolbox.utils.mySubs;
            } else {
                return;
            }
        }
 
        // Check dem values.
        if (subreddits.length < 1) return status.text('error, no subreddits selected');
        if (!api) return status.text('error, no action selected');
 
        // Ban dem trolls.
        var id = setInterval(function () {
            var sub = $(subreddits).get(actionCount);
 
            status.text(actionName + 'ning /u/' + user + ' from /r/' + sub);
 
            $.post('/api/' + api, {
                uh: reddit.modhash,
                type: action,
                name: user,
                r: sub,
                note: (banReason == modButton.BANREASON) ? '' : banReason,
                api_type: 'json'
            });
 
            actionCount++;
 
            if (actionCount === subreddits.length) {
                clearInterval(id);
                $('.mod-popup').remove();
            }
 
        }, 1000); //ban tax.
    });
 
    // 'cancel' button clicked
    $('body').delegate('.mod-popup .close', 'click', function () {
        $(this).parents('.mod-popup').remove();
    });

    $('body').delegate('.nuke-comment-chain', 'click', function () {
        var popup = $(this).parents('.mod-popup'),
            id = popup.find('#id').text();

        $.log(id);
    });
 
    $('body').delegate('.edit-user-flair', 'click', function () {
        var popup = $(this).parents('.mod-popup'),
            user = popup.find('#user').text(),
            subreddit = popup.find('#subreddit').text(),
            textinput = popup.find('.flair-text'),
            classinput = popup.find('.flair-class');
 
        if (!user || !subreddit) return;
 
        // TODO: replace this with a real tab view controller so we don't have to duplicate these lines all the time
        $(this).addClass('active');
        $(this).parents('.mod-popup').find('.user-role').removeClass('active');
        $(this).parents('.mod-popup').find('.edit-modbutton-settings').removeClass('active');

        $(this).parents('.mod-popup').find('.mod-popup-tab-settings').hide();
        $(this).parents('.mod-popup').find('.mod-popup-tab-flair').show();
        $(this).parents('.mod-popup').find('.mod-popup-tab-role').hide();
 

        $.getJSON('http://www.reddit.com/r/' + subreddit + '/api/flairlist.json?name=' + user, function (resp) {
            if (!resp || !resp.users || resp.users.length < 1) return;
 
            $(textinput).val(resp.users[0].flair_text);
            $(classinput).val(resp.users[0].flair_css_class);
            $('.flair-save').click(saveflair);
 
            function saveflair() {
                var text = $(textinput).val();
                var css_class = $(classinput).val();
 
                /*
                if (!text && !css_class) {
                    $.post('/api/deleteflair', {
                        api_type: 'json',
                        name: user,
                        r: subreddit,
                        uh: reddit.modhash
                    })
                    
                    .error(function (err) {
                        console.log(err.responseText);
                        popup.remove();
                        return;
                    })
                    
                    .success(function () {
                        popup.remove();
                        return;
                    });
                    
                    return;
                }
                */
 
                $.post('/api/flair', {
                    api_type: 'json',
                    name: user,
                    text: text,
                    css_class: css_class,
                    r: subreddit,
                    uh: reddit.modhash
                })
 
                .error(function (err) {
                    console.log(err.responseText);
                    popup.remove();
                })
 
                .success(function () {
                    popup.remove();
                });
            }
        });
    });
 
    // settings button clicked
    $('body').delegate('.user-role', 'click', function () {
        // TODO: replace this with a real tab view controller so we don't have to duplicate these lines all the time
        $(this).parents('.mod-popup').find('.edit-user-flair').removeClass('active');
        $(this).addClass('active');
        $(this).parents('.mod-popup').find('.edit-modbutton-settings').removeClass('active');

        $(this).parents('.mod-popup').find('.mod-popup-tab-settings').hide();
        $(this).parents('.mod-popup').find('.mod-popup-tab-flair').hide();
        $(this).parents('.mod-popup').find('.mod-popup-tab-role').show();
    });

    // settings button clicked
    $('body').delegate('.edit-modbutton-settings', 'click', function () {
        // TODO: replace this with a real tab view controller so we don't have to duplicate these lines all the time
        $(this).parents('.mod-popup').find('.edit-user-flair').removeClass('active');
        $(this).parents('.mod-popup').find('.user-role').removeClass('active');
        $(this).addClass('active');

        $(this).parents('.mod-popup').find('.mod-popup-tab-settings').show();
        $(this).parents('.mod-popup').find('.mod-popup-tab-flair').hide();
        $(this).parents('.mod-popup').find('.mod-popup-tab-role').hide();
  
        // display global ban button enabled/disabled
        $('.the-nuclear-option').prop('checked', modButton.setting('globalbutton', false));
    });
        
    $('body').delegate('.remove-save', 'click', function () {
        var subname = $('.remove-dropdown option:selected').val();
        
        modButton.savedSubs.splice(modButton.savedSubs.indexOf(subname), 1);
        $('.remove-dropdown').find('option[value="'+subname+'"]').remove();
    });
    
    $('body').delegate('.add-save', 'click', function () {
        var subname = $('.add-dropdown option:selected').val();
        
        // Don't add the sub twice.
        if ($.inArray(subname, modButton.savedSubs) === -1) {
            modButton.savedSubs.push(subname);
            $('.remove-dropdown').append($('<option>', { value: subname }).text('/r/' + subname));
        }
    });
 
    // Edit save button clicked.
    $('body').delegate('.settingSave', 'click', function () {
        var $popup = $(this).parents('.mod-popup'),
            $table = $(this).parents('.mod-popup').find('tbody');

        // TODO: replace this with a real tab view controller so we don't have to duplicate these lines all the time
        $(this).parents('.mod-popup').find('.edit-user-flair').removeClass('active');
        $(this).parents('.mod-popup').find('.user-role').addClass('active');
        $(this).parents('.mod-popup').find('.edit-modbutton-settings').removeClass('active');

        $(this).parents('.mod-popup').find('.mod-popup-tab-settings').hide();
        $(this).parents('.mod-popup').find('.mod-popup-tab-flair').hide();
        $(this).parents('.mod-popup').find('.mod-popup-tab-role').show();
  
        // Enable/disable global ban button.
        modButton.setting('globalbutton', false, $('.the-nuclear-option').is(':checked'));

        // show the global-button in the footer, if enabled
        if (modButton.setting('globalbutton', false)) {
            $('.mod-popup .global-button').show();
        } else {
            // disabled? Make sure it's not shown
            $('.mod-popup .global-button').hide();
        }

        modButton.savedSubs = Toolbox.utils.saneSort(modButton.savedSubs);
        modButton.savedSubs = modButton.setting('sublist', false, modButton.savedSubs);

        // re-render the lists
        modButton.updateSavedSubs();
    });
};

Toolbox.register_module(modButton);

}
 
// Add script to page
(function () {
    var s = document.createElement('script');
    s.textContent = "(" + modButtonWrapper.toString() + ')();';
    document.head.appendChild(s);
})();