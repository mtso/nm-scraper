const fs = require('fs');
const mkdirp = require('mkdirp');
const Nightmare = require('nightmare');

var nightmare = Nightmare();

var credentials;
fs.readFile('credentials.json', 'utf8', function(error, data) {
  if (error) { return console.log(error); }

  credentials = JSON.parse(data);
  console.log(credentials);
  // console.log(credentials.user);
  // console.log(credentials.pass);
})

const config = {
  series_name: 'lithium-flowers',
  series_url: 'https://www.neonmob.com/series/lithium-flowers/',
  login_url: 'https://www.neonmob.com/login',
  save_path: '.'
}

const selector = {
  overlay: '#ng-nm-overlay',
  checklist: '.set-detail--checklist.ng-scope.ng-isolate-scope',
  show_specials: '#sett-checklist--standard',
  piece_name: '.set-checklist--piece-name.ng-scope',

  list_standard_rarity: '.set-checklist.set-checklist--standard-rarity.ng-scope',
  list_specials_rarity: '.set-checklist.set-checklist--special-rarity.ng-scope',
  piece_hyperlink: 'a.ng-isolate-scope',

  signin_btn: '#btn-signin',
  user_label: '#form-field-username label.form--field--label.ng-scope',
  pass_label: '#form-field-password label.form--field--label.ng-scope',
  authenticate_signin: 'button#signin-btn.btn.full.ng-scope',
  authenticated_buttons: '.piece-detail--actions.authenticated.ng-scope',
  owners_btn: 'button#piece-detail-owners-button'
}


function getPieces(callback, url, selector) {
  (new Nightmare())
    .goto(url)
    .wait(selector.show_specials)
    .click(selector.show_specials)
    .evaluate(function(selector) {

      const sectionSelector = 'section.set-checklist--rarity-group';
      const rarities = [
        'common',
        'uncommon',
        'rare',
        'veryRare',
        'extremelyRare',
        'chase'
      ];

      var pieces = [];

      for (var rarity of rarities) {
        var links = document
                      .querySelector(sectionSelector + '.' + rarity)
                      .querySelectorAll(selector.piece_hyperlink);

        for (var link of links) {
          var piece = {
            rarity: rarity,
            url: link.href
          }
          pieces.push(piece);
        }
      }

      return pieces;
    }, selector)
    .end()
    .then(callback)
    .catch(function(error) {
      console.log(error);
    });
}

function signin(callback, url, selector, credentials) {
  nightmare
    .goto(url)
    .insert('input[id="field-username"]', credentials.user)
    .insert('input[id="field-password"]', credentials.pass)
    .click(selector.authenticate_signin)
    .wait('div.nm-display-case.ng-scope')
    .then(callback)
    .catch(function(error) {
      console.log(error);
    });
}

var isFirstCrawl = true;
function crawl(callback, piece, selector) {
  console.log(piece.url);

  // Register listener for alert once.
  if (isFirstCrawl) {
    isFirstCrawl = false;
    nightmare
      .on('page', function(type='alert', message) {
        callback(message);
      });
  }

  nightmare
    .goto(piece.url)
    .wait(selector.authenticated_buttons)
    .click(selector.owners_btn)
    .evaluate(function(rarity) {

      var loadingTolerance = 5000;
      var timeSinceLastScroll = 0;
      var previousScrollTop = 0;
      var previousUpdateTime = 0;
      var deltaTime = 0;
      var overlay = document.getElementById('ng-nm-overlay');
      var scroll;

      scroll = setInterval(function() {
        deltaTime = (previousUpdateTime == 0) ? 0 : Date.now() - previousUpdateTime;
        previousUpdateTime = Date.now();

        overlay.scrollTop += 100;
        if (overlay.scrollTop == previousScrollTop) {
          timeSinceLastScroll += deltaTime;

          if (timeSinceLastScroll > loadingTolerance) {
            // Probably reached bottom of the list
            clearInterval(scroll);

            var text = overlay.innerText;
            var url = document.URL;
            var time = (new Date).toString();
            var data = {
              url: url,
              timestamp: time,
              text: text,
              rarity: rarity
            }

            alert(data);
          }
        } else {
          timeSinceLastScroll = 0;
        }

        previousScrollTop = overlay.scrollTop;
      }, 10);

    }, piece.rarity)
    .catch(function(error) {
      console.log(error);
    });
}

function save(data) {
  var pieceName = data.url.replace(config.series_url, '').replace('/', '');
  var dir = config.save_path + '/' + config.series_name + '.nmdata/' + data.rarity;
  var filename = pieceName + '.txt';
  var textToSave = 'Accessed on ' + data.timestamp + '\n' + data.text;

  mkdirp(dir, function(error) { 
    if (error) { console.log(error); return; }
    
    fs.writeFile(dir + '/' + filename, textToSave, 'utf8');
  });

  var next = nextPiece();
  if (next) {
    crawl(save, next, selector);
  } else {
    console.log('finished crawl');
    nightmare.end();
  }
}

var pieceIndex = 0;
function nextPiece() {
  return pieces[pieceIndex++];
}

function beginCrawl() {
  crawl(save, nextPiece(), selector);
}

var pieces;
getPieces(function(pieces_data) {
  pieces = pieces_data;

  signin(function() {
    crawl(save, nextPiece(), selector);
  }, config.login_url, selector, credentials);

}, config.series_url, selector);
