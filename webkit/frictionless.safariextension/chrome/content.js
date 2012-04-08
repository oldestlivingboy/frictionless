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
//  * open links in new window
//  * auto-remove app authorizations

// Globals
var hostRegExp = new RegExp('^(?:f|ht)tp(?:s)?\://([^/]+)', 'im');

// 1. Cancel standalone dialogs
var apps = [
158825937536243,
// The Daily
194699337231859,
// Yahoo
235586169789578,
// Indy (UK)
368513495882,
// WSJ Social
180444840287,
// The Guardian
225771117449558,
// The Washington Post
319227784756907,
// Terra
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
run_story_rewrites();
document.body.addEventListener("load", run_story_rewrites, false);
document.body.addEventListener("load", run_link_rewrites, false);
document.body.addEventListener("DOMNodeInserted", run_story_rewrites, false);
document.body.addEventListener("DOMNodeInserted", run_link_rewrites, false);

function run_rewrites() {
  run_story_rewrites();
  run_link_rewrites();
};

function run_story_rewrites() {
    var story_links = $("a[href*='connect/uiserver.php?app_id='], a[data-appname][rel='dialog'], a[data-appname][title], h6.ministoryMessage > a[target='_blank'], a[href^='http://online.wsj.com']");
    story_links.forEach(kill_events_and_dialogs);
};

function run_link_rewrites() {
    var untrusted_links = $('a[href][onmousedown^="UntrustedLink"]');
    untrusted_links.forEach(kill_external_link_warning);
};

function kill_external_link_warning(node) {
    node.removeAttribute('onmousedown');
    node.setAttribute('data-frictionless-safe', 'true');
};

function kill_events_and_dialogs(node) {
    if (node.hasAttribute('data-frictionless')) return;
    node.onmousedown = null;
    node.removeAttribute('rel');
    node.removeAttribute('onmousedown');
    node.removeAttribute('data-hovercard');
    node.setAttribute('target', '_blank');
    node.setAttribute('data-frictionless', 'rewritten');
    rewrite_link(node);
};

function rewrite_link(el) {
    var orig_url = el.href;
    var params = get_params(orig_url);
    var new_url = false;

    var params_length = 0;
    for(var i in params) {
        if (params.hasOwnProperty(i)) {
            params_length++;
        }
    }

    // 1. indy, guardian, etc.
    if (params_length && 'redirect_uri' in params) {
      new_url = anonymize_link(params['redirect_uri']);
      
    // 2. washpo social
    } else if (orig_url.substr(7, 12) == 'fb.trove.com' || orig_url.substr(8, 12) == 'fb.trove.com') {
      var title = el.getAttribute('title');
      if (title) {
        new_url = get_google_redirect_from_title(title);
      } else {
        title = el.innerHTML;
        if (title) {
          new_url = get_google_redirect_from_title(title);
        } else {
          console.info('Trove link with no title:', el.href);
        }
      }
      
    // 3. wsj
    } else if (orig_url.substr(7, 14) == 'online.wsj.com' || orig_url.substr(8, 14) == 'online.wsj.com') {
      var article_link = anonymize_link(el.getAttribute('href'));
      if (article_link) {
        new_url = get_google_redirect_from_title(article_link);
      } else {
        console.info('wsj link with no title:', el.href);
      }
      
    // 4. else it works
    } else {
      new_url = anonymize_link(orig_url);
    }
    
    if(new_url != orig_url) {
      console.info('rewrote:', orig_url, '\nto:', new_url);
      el.setAttribute('href', new_url);
    } else {
      console.info('no rewrite:', orig_url, new_url);
    }
};


// Utility functions
function $(selector, rootNode) {
    var root = rootNode || document;
    var nodeList = root.querySelectorAll(selector);
    if (nodeList.length) {
      return Array.prototype.slice.call(nodeList);
    }
    return [];
};

function get_google_redirect_from_title(story_title) {
    // return a 'im feeling lucky' google search link for story title
    if(!story_title) {
      console.info('attempted rewrite on a story with no title');
    }
    story_title = story_title.replace(/ /g, '+');
    var search_url = "https://www.google.com/search?btnI=1&q=%22" + story_title + "%22";
    return search_url;
};

function get_params(dest_url) {
    dest_url = dest_url.replace(/&amp;/g, '&');
    var params = dest_url.substr(dest_url.indexOf("?") + 1).split('&'),
    r = {};
    if (typeof params !== 'object' || params.length < 1) return false;
    for (var x = 0; x <= params.length; x++) {
        if (typeof params[x] == "string" && params[x].indexOf('=')) {
            var t = params[x].split('=');
            if (t instanceof Array) {
                var k = t[0];
                if (t.length > 1) {
                    var z = t[1];
                    r[k] = decodeURIComponent(z);
                } else {
                    r[k] = '';
                }
            }
        }
    }
    return r;
};

function encode_qs(obj) {
    if (typeof obj !== 'object') return '';
    var r = [];
    for (var i in obj) {
        r.push(i + '=' + encodeURIComponent(obj[i]));
    };
    return r.join('&');
};

function anonymize_link(url) {
    // remove the facebook params in URLs to make the links anonymous
    var dirty_vars = ['fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref'],
    dl = dirty_vars.length;
    var url_params = get_params(url);
    if (!url_params) return url;
    var ret_url = '';
    if (url_params.length < 1)
    return url;
    for (var x = 0; x < dl; x++) {
        if (dirty_vars[x] in url_params)
        delete url_params[dirty_vars[x]];
    }
    return url.substr(0, url.indexOf('?')) + encode_qs(url_params);
};

function reverse_string(str) {
    return str.split('').reverse().join('');
};

function get_host(url) {
    var re = hostRegExp;
    var match = url.match(re);
    if (match instanceof Array && match.length > 0) return match[1].toString().toLowerCase();
    return false;
};

function open_new_win(url, options) {
    options = options || '';
    return window.open(url, '_blank', options);
};

