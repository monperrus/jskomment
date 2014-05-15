/* This is JSKOMMENT client-side Javascript.
 *
 * Should be served together with:
 * jQuery: <http://code.jquery.com/jquery-1.10.1.min.js>
 * swfobject: <>
 * JSON2: <http://www.JSON.org/json2.js>
 */

var JSKOMMENT = {}

var JSKOMMENT_CONFIG = window.JSKOMMENT_CONFIG || {};

/** The URL of the commenting system */
JSKOMMENT.url = JSKOMMENT_CONFIG.url || 'http://jskomment.appspot.com';

/** The URL of the CSS */
JSKOMMENT.CSS = JSKOMMENT_CONFIG.CSS || "./client/jskomment.css";

/** The URL of the wait image */
JSKOMMENT.waitImg = JSKOMMENT_CONFIG.waitImg || "./client/modal-ajax-wait.gif";

/** The presentation message of the Captcha system */
JSKOMMENT.captcha_message = JSKOMMENT_CONFIG.captcha_message || "Captcha (submit to reload a new one): ";

/** The method to use with the server 
 * GUESS: auto-detection based on heuristics (recommended)
 * PROBE: auto-detection based on trying a test URL on the server 
 * ALL_GET: only GET HTTP methods, the main limitation is on the maximum size of queries and comments
 * JSONP:  only GET HTTP methods, and accepts JSONP as answer, same size limitation as ALL_GET
 * FLASH: uses GET and POST as application/x-www-form-urlencoded, requires flash on the client
 * REST: the best solution, using advanced XHR
 */
//JSKOMMENT.protocol = 'ALL_GET';
//JSKOMMENT.protocol = 'JSONP'; // cross-browser
//JSKOMMENT.protocol = 'FLASH';// cross-browser
//JSKOMMENT.protocol = 'REST';
//JSKOMMENT.protocol = 'PROBE';
JSKOMMENT.protocol = JSKOMMENT_CONFIG.protocol || 'GUESS';

/** The max number of comments before folding them */
JSKOMMENT.maxComments = JSKOMMENT_CONFIG.maxComments ||  10;

/** The possible protocols, see JSKOMMENT.protocol, set by testConnection */
JSKOMMENT.supportedProtocols = {};

// the default function only handles new line (and allows to Markdown-like interpretation on the server side)
JSKOMMENT.format_function = JSKOMMENT_CONFIG.format_function || function (str) {
  return str.replace(/\n/g,'<br/>');
};

// end configuration
///////////////////////////////////////////////////////////////////////////////


if (window.console) {
  window.console.log("using server (JSKOMMENT.url):"+JSKOMMENT.url);
  window.console.log("using protocol (JSKOMMENT.protocol):"+JSKOMMENT.protocol);
}

/** triggers an Ajax call with tailoring for certain protocols (see JSKOMMENT.protocol) */
JSKOMMENT.ajax = function (ajaxParams, preferredMethod, protocol) {
  
  var theprotocol = protocol || JSKOMMENT.protocol;
  
  if (theprotocol == 'PROBE') {
    theprotocol = JSKOMMENT.preferredProtocol();
  } 
  
  if (theprotocol == 'ALL_GET') {
    ajaxParams.type = 'get';
    ajaxParams.contentType = 'application/x-www-form-urlencoded'; // response in JSON    
    ajaxParams.accepts = {json: 'application/json'};
    ajaxParams.dataType = 'json';
    ajaxParams.data = {data: JSON.stringify(ajaxParams.data)};
  } else if (theprotocol == 'JSONP') {
    //ajaxParams.type = 'get';// automatically set by contentType
    ajaxParams.contentType = 'application/jsonp'; 
    ajaxParams.accepts = {jsonp: 'application/javascript'};// for JSON-P
    ajaxParams.dataType = 'jsonp'; // will modify HTTP header accept
    ajaxParams.data = {data: JSON.stringify(ajaxParams.data), contentType: 'application/jsonp'};    
  } else if (theprotocol == 'FLASH') {
    ajaxParams.type = preferredMethod;
    ajaxParams.contentType = 'application/x-www-form-urlencoded';// by flash we can not send in JSON directly 
    ajaxParams.accepts = {json: 'application/json'};
    ajaxParams.dataType = 'json';
    ajaxParams.data = {data: JSON.stringify(ajaxParams.data)};;
    ajaxParams.xhr  = JSKOMMENT.xhr;
  } else if (theprotocol == 'REST') {
    ajaxParams.type = preferredMethod;
    ajaxParams.dataType = 'json';
    ajaxParams.contentType = 'application/json'; // response in JSON
    ajaxParams.accepts = {json: 'application/json'};
    ajaxParams.data = JSON.stringify(ajaxParams.data);
  } else { throw "oops no protocol "+theprotocol; }
  
  $.ajax(ajaxParams);
};

/** sends the comment using the <FORM> received as elem */
JSKOMMENT.send = function (elem, callback) {
  
  if (!$(elem).hasClass('jskomment')) {
    var msg = 'error in API usage';
    window.console.log(msg);
    throw msg;
  }
  
  var data = {};
  $($(elem).find('.jskomment_form').serializeArray()).each(function(i,el) {
    data[el.name]=el.value;
  });
  
  // saving some values in local storage if possible
  try { if (localStorage) {localStorage.setItem('jskomment_username', $(elem).find('input[name="name"]').val());}} catch (e) {}
  try { if (localStorage) {localStorage.setItem('jskomment_email', $(elem).find('input[name="email"]').val());}} catch (e) {}
    
  // by default we use JSON-P with HTTP GET = Script node insertion in JQuery
  // cross-browser but limited to ~2k data
  var ajaxParams = {
    url: JSKOMMENT.url+'/p',
    dataType: 'json',
    data: data,
    success: function(val){
      JSKOMMENT.load(elem);
      if (callback) { callback(); }
    },     
    error: function (xhr,err) {
      if (xhr.status == 403) { // unauthorized
        try {
        JSKOMMENT_CONFIG.authenticate(elem);        
        } catch (exception) {
          $('.jskomment').text('[jskomment] error no function authenticate while server sends 403 unauthorized'+exception);
        }
      }     
      if (xhr.status == 503) {
        alert(xhr.responseText);        
      }     
    }
  }
  
  try {
    JSKOMMENT.ajax(ajaxParams, 'POST');
  } catch(e) {
    window.console.log(e);
  }
  
  return false;
}

JSKOMMENT.display = function (array /* array of comment objects */) {
  
  var len = array.length;
  if (len == 0) { return ; }
  // we assume that all comments of this list refers to the same comment thread
  var title = array[0].title;
  var elem = $('[_title="'+title+'"]');
  
  elem.find('.jskomment_header').html($('<a href="javascript:void(0)">Discussion ('+len+')</a>'));
  
  // if there are too may comments and we are not redrawing after having added a comment
  if (len>JSKOMMENT.maxComments && !elem.find('.jskomment_previous').attr('add_comment')) {
    elem.find('.jskomment_previous, .jskomment_add_comment').hide();
  }
  
  elem.find('.jskomment_previous').empty();
  
  // replacing the form
  // by a link
  elem.find('.jskomment_form').replaceWith(JSKOMMENT.createAddCommentElement());
  
  $(array).each(function (k,commentEntry) {
    if (!commentEntry || commentEntry.title != title) { 
      return; // resilience, should not crash if there is some garbage in the data
    };
    var ePoster = $('<span class="jskomment_user"/>').text(commentEntry.name+': ');                                                              
    var eContent = $('<span class="jskomment_commentval"/>').html(
      JSKOMMENT.format_function(commentEntry.comment)
    );                                                                                     
    var eDate = '';
    if (commentEntry.date) { eDate = $('<span class="jskomment_date"/>').text('('+commentEntry.date+')'); }
    var eComment = $('<div class="jskomment_comment"/>').append(ePoster).append(eContent).append(eDate);                          
    elem.find('.jskomment_previous').append(eComment);
  }
    );
    
    // now we can re-enable the form
    JSKOMMENT.enableForms();
    
}

/** batch load of comments, receives an array of requests */
JSKOMMENT.multiload = function(request) {
  // by default we use JSON-P with HTTP GET = Script node insertion in JQuery
  // cross-browser but limited to ~2k data
  var ajaxParams = {
    url: JSKOMMENT.url+'/sx',
    data: request,
    success: function(val){
      $(val).each(function (k,array) {
        JSKOMMENT.display(array);
      });
    },
    error: function(e) { 
      $('.jskomment').text('[jskomment] AJAX error, server message: '+e.error().responseText);
      window.console.error('JSKOMMENT.multiload:'+(e.error().responseText));       
    }
  }
  
  // POST is the preferred method
  // from a conceptual REST view point GET would be better
  // but in this case the query can be really long
  JSKOMMENT.ajax(ajaxParams, 'POST'); 
}

/** loads comments from the server and display them */
JSKOMMENT.load = function (elem) {
  if (!$(elem).hasClass('jskomment')) {
    var msg = 'error in API usage';
    window.console.log(msg);
    throw msg;
  }
  JSKOMMENT.ajax({
    url: JSKOMMENT.url+'/s',
    data : {title:$(elem).attr('_title')},
                 success: JSKOMMENT.display
  }, 'GET');
}

/** returns a clickable DOM element to add a comment
 * For instance, <a>Click to add a comment</a>
 */
JSKOMMENT.createAddCommentElement = function () {
  var addCommentLink = $(document.createElement('a'));
  addCommentLink.attr('href','javascript:void(0)');
  addCommentLink.attr('class','jskomment_add_comment');
  addCommentLink.text('Click to leave a comment');
  
  addCommentLink.click(function() {
    var clicked = this; // this is bound by click
    $(clicked).hide();
    var elem = $(clicked).parents('.jskomment');
    elem.find('.jskomment_previous').show();
    elem.find('.jskomment_previous').attr('add_comment', true);
    var title = elem.attr('_title');
    var name='your name';
    try { name = localStorage.getItem('jskomment_username') || name; } catch (e) {}
    var email='';
    try { email = localStorage.getItem('jskomment_email') || email; } catch (e) {}
    var form = $('<form class="jskomment_form jskomment_add_comment">'
    +'<input id="title" type="hidden" name="title" value="'+title+'"/>'
    +'<div class="jskomment_input1">New comment from <input type="text" name="name" size="15"  value="'+name+'"/>: </div>'
    +'<div class="jskomment_input1">Email (optional, for pingback): <input type="text" name="email" size="15"  value="'+email+'"/>: </div>'
    +'<div class="jskomment_commentval"><textarea class="jskomment_input2" rows="6" cols="32" name="comment" value="your comment"/></div>'
    +'</form>');   
    
    form.submit(
      function (ev) {
        JSKOMMENT.disableForms();
        JSKOMMENT.send($(ev.target).parents('.jskomment')); 
        return false;
      }
    );
    $(clicked).parents('.jskomment').append(form);
    $(clicked).remove();
    $('<div class="jskomment_captcha"></div>').appendTo(form);    
    $('<div class="jskomment_submit"><input class="jskomment_button" name="submit" type="submit" value="submit"/></div>').appendTo(form);    
  }); // end click function
    return addCommentLink;
};

/** inits a commenting section */
JSKOMMENT.init = function (elem) {
  
  if (!$(elem).hasClass('jskomment')) {
    var msg = 'error in API usage';
    window.console.log(msg);
    throw msg;
  }
  
  var title = $(elem).attr('title');
  if (title === undefined || title === "") {
    title = document.location.href;
  }
  // setting the title in _title
  // because the browser uses this field as tooltip
  $(elem).attr('_title',title);
  $(elem).attr('title','Commenting area powered by jskomment');
  
  var jskomment_header = $('<div class="jskomment_header"></div>');
  jskomment_header.click(function() {$(elem).find('.jskomment_previous, .jskomment_add_comment').toggle();});
  jskomment_header.appendTo(elem);
  var jskomment_previous = $('<div class="jskomment_previous"></div>');
  jskomment_previous.appendTo(elem);
  
  var addCommentLink = JSKOMMENT.createAddCommentElement();
  addCommentLink.appendTo($(elem));
  
  
}; // end function init

// uses a test web service on the server to check which protocols are supported on the client browser */
JSKOMMENT.testConnection = function(callback) {
  JSKOMMENT.ajax({
    url: JSKOMMENT.url+'/t',
    data : 'REST',
    success: function(response) {
      if (response==='REST') { JSKOMMENT.supportedProtocols['REST'] = 'ok'; }
    }
  }, 'POST', 'REST');
  if (JSKOMMENT.usingFlash) { 
    JSKOMMENT.ajax({
      url: JSKOMMENT.url+'/t',
      data : 'FLASH',
      success: function(response) {
        if (response==='FLASH') { JSKOMMENT.supportedProtocols['FLASH'] = 'ok'; }
      }
    }, 'POST', 'FLASH');
  }
  JSKOMMENT.ajax({
    url: JSKOMMENT.url+'/t',
    data : 'JSONP', // for JSONP, the response must be a valid JS expression
    success: function(response) {
      if (response==='JSONP') { JSKOMMENT.supportedProtocols['JSONP'] = 'ok'; }
    }
  }, 'POST', 'JSONP');
  JSKOMMENT.ajax({
    url: JSKOMMENT.url+'/t',
    data : 'ALL_GET',
    success: function(response) {
      if (response==='ALL_GET') { JSKOMMENT.supportedProtocols['ALL_GET'] = 'ok'; }
    }
  }, 'POST', 'ALL_GET');  
};

/** guesses a protocol that is supported by the browser, ideally REST with cross-domain support */
JSKOMMENT.guessProtocol = function() {
  /** Can we use XMLHttpRequest for cross-domain HTTP POST? 
   * @see http://www.w3.org/TR/XMLHttpRequest2/
   * @see http://hacks.mozilla.org/2009/07/cross-site-xmlhttprequest-with-cors/
   */
  if ((new XMLHttpRequest()).withCredentials !== undefined) {
    JSKOMMENT.protocol = 'REST';
  } else 
    if (JSKOMMENT.usingFlash) {    
      JSKOMMENT.protocol = 'FLASH';
    } else {
      // we always default JSONP
      JSKOMMENT.protocol = 'JSONP';    
    }
}

/** returns the client preferred protocol based on probing data obtained beforehand */
JSKOMMENT.preferredProtocol = function() {
  if ('REST' in JSKOMMENT.supportedProtocols) return 'REST';
  if ('FLASH' in JSKOMMENT.supportedProtocols) return 'FLASH';
  if ('JSONP' in JSKOMMENT.supportedProtocols) return 'JSONP';
  if ('ALL_GET' in JSKOMMENT.supportedProtocols) return 'ALL_GET';
  return 'JSONP';
}

JSKOMMENT.loadSWF = function(callback) {
  if (window.swfobject) 
  {
    var flash = $(document.createElement('div'));
    flash.attr({
      id:  "jskomment_flash"
    });
    flash.appendTo($('body'));
    swfobject.embedSWF(
      JSKOMMENT.url+'/swfhttprequest.swf',
      'jskomment_flash',"0", "0", "9.0.0", false, false, 
      {allowscriptaccess:'always'}, {allowscriptaccess:'always'},
      function(e) {
        if (e.success) {  
          if (window.console) { 
            window.console.log('flash enabled');
          }
          JSKOMMENT.usingFlash = true;
          JSKOMMENT.xhr  = function(){return new window.SWFHttpRequest();};
          // set timeout is required
          // so that we are (almost) sure that it is really loaded
          setTimeout(function () { callback(true); }, 500);
        }
        else {callback(false);}
      }
    );
  } 
};

// main main
JSKOMMENT.main = function () {
        
  $(document).ready(function(){
    JSKOMMENT.mainContinue();
  
    // and finally we load the css
    var css = $(document.createElement('link'));
    css.attr({
      rel:  "stylesheet",
      type: "text/css",
      href: JSKOMMENT.CSS
    });
    css.appendTo($('head'));
  }); // end DOM ready
};


// continue once flash is loaded
JSKOMMENT.mainContinue = function () {
  
  if (JSKOMMENT.protocol === 'FLASH') {
    JSKOMMENT.loadSWF(function(res) {/* nothing for now */});
  }
  if (JSKOMMENT.protocol === 'PROBE') {
    JSKOMMENT.testConnection();
  }
  if (JSKOMMENT.protocol === 'GUESS') {
    JSKOMMENT.guessProtocol();
  }
  
  // we must wait for testConnection to complete
  setTimeout(function() {
    // adding the form top enter new comments
    $('.jskomment').each(function(k,elem) { 
      // adding the UI elements
      JSKOMMENT.init(elem);
    });
    
    var request = [];
    $('.jskomment').each(function(k,elem) { 
      // requesting all comments
      request.push({title:$(elem).attr('_title')});
      });
      JSKOMMENT.multiload(request);
      
    }, 500
  );
};
  
/** generates a unique identifier */
JSKOMMENT.uniqid = function  (prefix, more_entropy) {
  // +   original by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
  // +    revised by: Kankrelune (http://www.webfaktory.info/)
  // %        note 1: Uses an internal counter (in php_js global) to avoid collision
  // *     example 1: uniqid();
  // *     returns 1: 'a30285b160c14'
  // *     example 2: uniqid('foo');
  // *     returns 2: 'fooa30285b1cd361'
  // *     example 3: uniqid('bar', true);
  // *     returns 3: 'bara20285b23dfd1.31879087'
  
  if (typeof prefix == 'undefined') {
    prefix = "";
  }
  
  var retId;
  var formatSeed = function (seed, reqWidth) {
    seed = parseInt(seed,10).toString(16); // to hex str
    if (reqWidth < seed.length) { // so long we split
          return seed.slice(seed.length - reqWidth);
    }
    if (reqWidth > seed.length) { // so short we pad
          return Array(1 + (reqWidth - seed.length)).join('0')+seed;
    }
    return seed;
  };
  
  // BEGIN REDUNDANT
  if (!this.php_js) {
    this.php_js = {};
  }
  // END REDUNDANT
  if (!this.php_js.uniqidSeed) { // init seed with big random int
      this.php_js.uniqidSeed = Math.floor(Math.random() * 0x75bcd15);
  }
  this.php_js.uniqidSeed++;
  
  retId  = prefix; // start with prefix, add current milliseconds hex string
  retId += formatSeed(parseInt(new Date().getTime()/1000,10),8);
  retId += formatSeed(this.php_js.uniqidSeed,5); // add seed hex string
  
  if (more_entropy) {
    // for more entropy we add a float lower to 10
    retId += (Math.random()*10).toFixed(8).toString();
  }
  
  return retId;
}

/**  disables the submit form */
JSKOMMENT.disableForms = function() {
  var submit = $('.jskomment input[type="submit"]');
  submit.attr("disabled", true);
  submit.after($('<img class="modal-ajax-wait" src="'+JSKOMMENT.waitImg+'"/>'));
}

/**  re-enables the submit form */
JSKOMMENT.enableForms = function() {
  var submit = $('.jskomment input[type="submit"]');
submit.attr("disabled", false);
submit.parent().find('.modal-ajax-wait').remove();
}

/** adds a captcha in the comment form */
JSKOMMENT.authenticate_with_captcha_default = function(elem) {
  $.ajax({
    url:JSKOMMENT_CONFIG.captcha_url,
    success:function(response) {
      $('.jskomment_captcha').html($('<div>'+JSKOMMENT.captcha_message+'<img src="data:image/jpeg;base64,'+response.challenge_data+'"/>'
      +'</div>'));
      
      // adding the challenge id
      $('<input type="hidden" name="captcha_challenge_field" value="'+response.challenge_id+'"/>').appendTo($('.jskomment_captcha'));    

      $('<input type="text" name="captcha_response_field"/>').appendTo($('.jskomment_captcha'));    

      // the user can submit again with the captcha
      JSKOMMENT.enableForms();
    }
  });
};

