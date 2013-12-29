jskomment
=========

jskomment is an open source commenting system that is built on javascript and AJAX.

It is inspired from <http://www.js-kit.com>, <http://www.intensedebate.com> and <http://www.disqus.com>. Its unique feature compared to the competition is that it supports multiple different comment threads per page.

Being open-source, you can modify it as much as you need, and you have access to the raw comment data.

Demo: <http://www.monperrus.net/martin/open+source+ajax+commenting+system>

Pull requests welcome!

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

Troubleshooting
---------------
Is `.htaccess` readable by the web server and loaded? Is mod_rewrite loaded?
