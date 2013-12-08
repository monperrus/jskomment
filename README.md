jskomment
=========

jskomment is an open source commenting system that is built on javascript and AJAX.

It is inspired from http://www.js-kit.com, http://www.intensedebate.com and http://www.disqus.com. Its unique feature compared to the competition is that it supports multiple different comment threads per page.

Being open-source, you can modify it as much as you need, and you have access to the raw comment data.

Demo: http://www.monperrus.net/martin/open+source+ajax+commenting+system

Installation
------------
Run jskomment.php on a server. It writes the comments on disk so correct writing permissions should be given.


Adds the following snippet in your web page. Ensure that JQuery is loaded as well.

For page-based commenting:

    <div class="jskomment"></div>
    <script src="jskomment.js"></script>

For multipe commenting threads per page:

    <div class="jskomment" title="http://example.com/identifier1"></div>
    <div class="jskomment" title="http://example.com/identifier2"></div>
    <div class="jskomment" title="http://example.com/identifier3"></div>
    <script src="jskomment.js"></script>

