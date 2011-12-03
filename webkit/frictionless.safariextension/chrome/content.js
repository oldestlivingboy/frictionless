/*
  A content script that bypasses adding news apps on Facebook.

  Copyright 2011 Brian Kennish and Nik Cubrilovic

  This program is free software: you can redistribute it and/or modify it under
  the terms of the GNU General Public License as published by the Free Software
  Foundation, either version 3 of the License, or (at your option) any later
  version.

  This program is distributed in the hope that it will be useful, but WITHOUT
  ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
  FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

  You should have received a copy of the GNU General Public License along with
  this program. If not, see <http://www.gnu.org/licenses/>.

  Authors (one per line):

    Brian Kennish <byoogle@gmail.com>
    Nik Cubrilovic <nikcub@gmail.com>
*/

// @TODO add options page with:
//        * open links in new window
//        * auto-remove app authorizations (single button, click once and removes all social sharing apps)
// @TODO need to detect only the boxes that close and redirect here
// @TODO not closing some dialogs (The Independant)
// Globals
var hostRegExp = new RegExp('^(?:f|ht)tp(?:s)?\://([^/]+)', 'im');

// 1. Cancel standalone dialogs
var apps = [
180444840287,
// The Guardian
225771117449558
// The Washington Post
];
var appCount = apps.length;

for (var i = 0; i < appCount; i++) {
    if (
    location.href.indexOf('dialog/permissions.request?app_id=' + apps[i]) + 1
    ) {
        var button = document.getElementsByName('cancel_clicked')[0];
        console.info('cancel:', button);
        button.click();
        break;
    }
}

// 2. Cancel lightboxed dialogs
var d_els = document.querySelectorAll("a[data-appname][rel='dialog']");
// this could possibly be a better selector.
var s_els = document.querySelectorAll("h6.ministoryMessage > a[target='_blank']");

kill_events_and_dialogs(d_els);
kill_events_and_dialogs(s_els);

function kill_events_and_dialogs(nodelist) {
  var length = nodelist.length;
  for (var x = 0; x < length; x++) {
    var n = nodelist.item(x);
    n.onmousedown = null;
    n.removeAttribute('rel');
    n.removeAttribute('onmousedown');
    n.setAttribute('target', '_blank');
    rewrite_link(n);
  }
}


function rewrite_link(el) {
    var params = get_params(el.href);
    if ('redirect_uri' in params) {
        // console.info('link_rewrite:', el, params['redirect_uri']);
        el.setAttribute('href', params['redirect_uri']);
    }
};

// 3. Parse link click events
document.body.addEventListener("mousedown", parse_link_event);
function parse_link_event(ev) {
    console.info('clicked link');

    if (ev.target && ev.target.nodeName == 'A') {
        var params = get_params(ev.target.href);
        var host = get_host(ev.target.href);

        ev.preventDefault();
        if ('redirect_uri' in params) {
            open_new_win(params['redirect_uri']);
            return false;
        }
    }
};


// Utility functions
function get_params(dest_url) {
    var params = dest_url.substr(dest_url.indexOf("?") + 1).split('&'),
    r = {};
    if (typeof params !== 'object' || params.length < 2) return false;
    for (var x = 0; x <= params.length; x++) {
        if (typeof params[x] == "string" && params[x].indexOf('=')) {
            var t = params[x].split('='),
            k = t[0],
            z = t[1];
            r[k] = decodeURIComponent(z);
        }
    }
    return r;
};

function reverse_string(str) {
    return str.split('').reverse().join('');
};

function get_host(url) {
    var re = hostRegExp;
    return url.match(re)[1].toString().toLowerCase();
};

function open_new_win(url) {
    return window.open(url, '_blank', options);
};

