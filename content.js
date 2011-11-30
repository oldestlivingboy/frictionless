/*
  A content script that cancels adding an app on Facebook.

  Copyright 2011 Brian Kennish

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
*/

// @TODO add options page with:
//        * open links in new window
//        * auto-remove app authorizations (single button, click once and removes all social sharing apps)

// @TODO need to detect only the boxes that close and redirect here
// @TODO not closing some dialogs (The Independant)
var v = document.getElementsByName('cancel_clicked');
if(v.length) {
  console.info('frictionless:cancel_clicked:', v[0]);
  v[0].click();
}

// @TODO rewrite a href's so that the dialog doesn't appear (remove rel=dialog)

var d_els = document.querySelectorAll("a[data-appname][rel='dialog']");
for(var x=0; x < d_els.length; x++) {
  var n = d_els.item(x);
  var norel = document.createAttribute('rel');
  norel.value = '';
  n.attributes.setNamedItem(norel);
}
document.body.addEventListener("click", parse_links);


function parse_links(ev) {
  if(ev.target && ev.target.nodeName == 'A' && ev.target.pathname == '/connect/uiserver.php') {
    var params = get_params(ev.target.href);
    // if(!params) return true;
    // some apps have the redir which we can go to
    if('redirect_uri' in params) {
      // window.document.location = params['redirect_uri'];
      open_new_win(params['redirect_uri']);
      
      // @TODO recreate the orig link and click() it
      // ev.target.href = params['redirect_uri'];

      return false;
    }
    // otherwise go straight to the link
    window.document.location = ev.target.href;
  }
};

function get_params(dest_url) {
  var params = dest_url.substr(dest_url.indexOf("?")+1).split('&'), r={};
  if(typeof params !== 'object' || params.length < 2) return false;
  for(var x=0; x<=params.length;x++) {
    if(typeof params[x] == "string" && params[x].indexOf('=')) { 
      var t=params[x].split('='), k=t[0], z=t[1]; 
      r[k]=decodeURIComponent(z);
    }
  }
  return r;
};

function open_new_win(url) {
  var opts = 'toolbar=1,location=1,directories=1,status=1,menubar=1,scrollbars=1,resizable=1';
  var options = '';
  var new_win = window.open(url, '_blank', options); 
  return new_win;
}
