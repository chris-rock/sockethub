angular.module('facebook', []).

/**
 * Factory: Facebook
 */
factory('Facebook', ['$rootScope', '$q', 'SH', 'configHelper',
function Facebook($rootScope, $q, SH, CH) {
  var config = {
    username: '',
    access_token: ''
  };

  function exists(cfg) {
    return CH.exists(config, cfg);
  }

  function set(cfg) {
    var defer = $q.defer();
    if (exists(cfg)) {
      if (cfg) {
        CH.set(config, cfg);
      }

      if (SH.isConnected()) {
        var cred_tpl = SOCKETHUB_CREDS['facebook']['credentials']['# useraddress #'];
        cred_tpl.access_token = config.access_token;
        cred_tpl.actor.address = config.username;
        cred_tpl.actor.name = '';
        SH.set('facebook', 'credentials', config.username, cred_tpl).
          then(function () {
            defer.resolve(config);
          }, defer.reject);
      } else {
        defer.reject('not connected to sockethub');
      }
    } else {
      defer.reject('config not set correctly');
    }

    return defer.promise;
  }

  function post(msg) {
    var defer = $q.defer();
    msg.platform = 'facebook';
    msg.verb = 'post';
    console.log("POST: ", msg);
    SH.submit(msg, 5000).then(defer.resolve, defer.reject);
    return defer.promise;
  }

  function fetch(msg) {
    var defer = $q.defer();
    msg.platform = 'facebook';
    msg.verb = 'fetch';
    console.log("FETCH: ", msg);
    SH.submit(msg, 5000).then(defer.resolve, defer.reject);
    return defer.promise;
  }


  var feedData = [];

  SH.on('facebook', 'message', function (m) {
    console.log("Facebook received message: ", m);
    feedData.push(m);
  });

  return {
    config: {
      exists: exists,
      set: set,
      data: config
    },
    feeds: {
      data: feedData
    },
    post: post,
    fetch: fetch
  };
}]).


/**
 * config
 */
config(['$routeProvider',
function config($routeProvider) {
  $routeProvider.
    when('/facebook', {
      templateUrl: 'templates/facebook/settings.html'
    }).
    when('/facebook/post', {
      templateUrl: 'templates/facebook/post.html'
    }).
    when('/facebook/fetch', {
      templateUrl: 'templates/facebook/fetch.html'
    }).
    when('/facebook/feeds', {
      templateUrl: 'templates/facebook/feeds.html'
    });
}]).


/**
 * directive: platformNav
 */
directive('facebookNav', [
function () {
  return {
    restrict: 'A',
    template: '<div ng-controller="facebookNavCtrl">' +
              '  <ul class="nav nav-tabs">' +
              '    <li ng-class="navClass(\'facebook\')">' +
              '      <a href="#/facebook">Settings</a>' +
              '    </li>' +
              '    <li ng-class="navClass(\'facebook/post\')">' +
              '      <a href="#/facebook/post">Post</a>' +
              '    </li>' +
              '    <li ng-class="navClass(\'facebook/fetch\')">' +
              '      <a href="#/facebook/fetch">Fetch</a>' +
              '    </li>' +
              '    <li ng-class="navClass(\'facebook/feeds\')">' +
              '      <a href="#/facebook/feeds">Feeds</a>' +
              '    </li>' +
              '  </ul>' +
              '</div>'
  };
}]).


/**
 * Controller: facebookNavCtrl
 */
controller('facebookNavCtrl',
['$scope', '$rootScope', '$location',
function facebookNavCtrl($scope, $rootScope, $location) {
  $scope.navClass = function (page) {
    var currentRoute = $location.path().substring(1) || 'home';
    return page === currentRoute ? 'active' : '';
  };
}]).


/**
 * Controller: facebookSettingsCtrl
 */
controller('facebookSettingsCtrl',
['$scope', '$rootScope', 'settings', 'Facebook',
function facebookSettingsCtrl($scope, $rootScope, settings, Facebook) {
  settings.save($scope, Facebook);
}]).


/**
 * Controller: facebookPostCtrl
 */
controller('facebookPostCtrl',
['$scope', '$rootScope', 'Facebook', '$timeout',
function facebookPostCtrl($scope, $rootScope, Facebook, $timeout) {
  $scope.sending = false;
  $scope.model = {
    sendMsg: '',

    message: {
      actor: {
        address: ''
      },
      target: [],
      object: {
        text: 'Hello from @sockethub! http://sockethub.org'
      }
    }
  };

  $scope.config = Facebook.config;

  $scope.post = function () {
    $scope.sending = true;
    $scope.model.message.actor.address = $scope.config.data.username;
    Facebook.post($scope.model.message).then(function () {
      $scope.model.sendMsg = 'facebook post successful!';
      console.log('facebook post successful!');
      $scope.model.message.object.text = '';
      $scope.sending = false;
      $timeout(function () {
        $scope.model.sendMsg = 'fill out form to make a facebook post';
      }, 5000);

    }, function (err) {
      console.log('facebook post failed: ', err);
      $scope.model.sendMsg = err;
      $timeout(function () {
        $scope.model.sendMsg = '';
      }, 5000);
    });
  };

  $scope.formFilled = function () {
    if ($scope.model.message.object.text) {
      return true;
    } else {
      return false;
    }
  };

  if ($scope.config.exists()) {
    $scope.model.sendMsg = 'fill out form to make a facebook post';
  } else {
    $scope.model.sendMsg = 'you must complete the settings in order to post to facebook';
  }
}]).


/**
 * Controller: facebookFetchCtrl
 */
controller('facebookFetchCtrl',
['$scope', '$rootScope', 'Facebook', '$timeout',
function ($scope, $rootScope, Facebook, $timeout) {
  $scope.sending = false;
  $scope.model = {
    sendMsg: '',

    message: {
      actor: {
        address: ''
      },
      target: []
    }
  };

  $scope.config = Facebook.config;

  $scope.addTarget = function () {
    console.log('scope:', $scope);
    $scope.model.message.target.push({address: $scope.model.targetAddress});
    $scope.model.targetAddress = '';
  };

  $scope.fetchFacebook = function () {
    $scope.model.sendMsg = 'fetching feeds...';
    $scope.sending = true;
    $scope.model.message.actor.address = $scope.config.data.username;
    Facebook.fetch($scope.model.message).then(function (data) {
      $scope.model.sendMsg = 'facebook fetch successful!';
      console.log('facebook fetch successful! ', data);
      $scope.sending = false;
      $timeout(function () {
        $scope.model.sendMsg = 'click the feeds tab to view fetched entries';
      }, 2000);
    }, function (err) {
      console.log('facebook fetch failed: ', err);
      $scope.model.sendMsg = err;
      /*$timeout(function () {
        $scope.model.sendMsg = '';
      }, 5000);*/
    });
  };

  $scope.formFilled = function () {
    if ($scope.model.message.target) {
      return true;
    } else {
      return false;
    }
  };

  if ($scope.model.message.target.length === 0) {
    $scope.model.sendMsg = 'add facebook feeds to fetch';
  } else {
    $scope.model.sendMsg = '';
  }
}]).


/**
 * controller: facebookFeedCtrl
 */
controller('facebookFeedsCtrl',
['$scope', 'Facebook',
function ($scope, Facebook) {
  $scope.feeds = Facebook.feeds.data;
}]).


/**
 * directive: posts
 */
directive('posts', [
function () {
  return {
    restrict: 'A',
    scope: {
      feeds: '='
    },
    template: '<div class="well tweets" ng-repeat="t in feeds">' +
              '  <h2>{{ t.actor.name }}</h2>' +
              '  <p>{{ t.object.brief_text }}</p>' +
              '  <img src="{{ t.object.image }}"/>' +
              '</div>',
    transclude: true
  };
}]);
