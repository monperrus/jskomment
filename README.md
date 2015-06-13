jskomment
=========

jskomment is an open source commenting system that is built on javascript and AJAX.

**No support is provided. Pull requests are welcome**

jskomment is inspired from <http://www.js-kit.com>, <http://www.intensedebate.com> and <http://www.disqus.com>. Its unique feature compared to the competition is that it supports multiple different comment threads per page.

Being open-source, you can modify it as much as you need, and you have access to the raw comment data.

Demo: <http://www.monperrus.net/martin/open+source+ajax+commenting+system>

Installation
------------
Create a folder for the data files:

    cd server
    mkdir jskomment-data
    chmod 777 jskomment-data

Open `test.html`

Alternatively, add the following snippet in your web page (ensure that JQuery is loaded as well, see `test.html`)

For page-based commenting:

    <script src="http://code.jquery.com/jquery-1.10.1.min.js"></script>
    <script src="jskomment-core.js"></script>
    <div class="jskomment"></div>
    <script> JSKOMMENT.main(); </script>
    
**How to support Markdown in comments?**

You can use any JS markdown library. For instance, with [pagedown](https://code.google.com/p/pagedown/):

    <script type="text/javascript" src="pagedown/Markdown.Converter.js"></script>
    <script type="text/javascript" src="pagedown/Markdown.Sanitizer.js"></script>
    <script> 
    var converter = new Markdown.Converter();
    JSKOMMENT_CONFIG={};
    JSKOMMENT_CONFIG.url="http://www.example.com/jskomment/";
    JSKOMMENT_CONFIG.format_function = function (str) { 
      return converter.makeHtml(str);
    };
    </script>
    
**How to protect comments with captchas?**

You can set up a captcha URL as follow:

    JSKOMMENT_CONFIG={};
    JSKOMMENT_CONFIG.captcha_url = 'http://www.monperrus.net/martin/captcha.php';
    JSKOMMENT_CONFIG.authenticate = function(elem) {
      JSKOMMENT.authenticate_with_captcha_default(elem);
    };



Troubleshooting
---------------
Is `.htaccess` readable by the web server and loaded? Is mod_rewrite loaded?
