'use strict';

describe('userServices', function() {
  var $httpBackend, $window, user, STORAGE_USER_ID, STORAGE_SETTINGS_ID;

  beforeEach(module('habitrpg'));
  beforeEach(module('notificationServices'));

  beforeEach(function(){
    module(function($provide){
      var habitrpgShared = {helpers: {newUser: sinon.spy()}};
      $window = {href: '', alert: sinon.spy(), location: {search: '', pathname: ''}, habitrpgShared: habitrpgShared};
      $provide.value('$window', $window);
    });

    inject(function(_$httpBackend_, User, _STORAGE_USER_ID_, _STORAGE_SETTINGS_ID_) {
      $httpBackend = _$httpBackend_;
      user = User;
      STORAGE_USER_ID = _STORAGE_USER_ID_;
      STORAGE_SETTINGS_ID = _STORAGE_SETTINGS_ID_;
    });
    localStorage.removeItem(STORAGE_SETTINGS_ID);
    localStorage.removeItem(STORAGE_USER_ID);
  });

  it('checks online status', function(){
    user.online(true);
    expect(user.settings.online).to.be.true;
    user.online(false);
    expect(user.settings.online).to.be.false;
  })

  it('saves user data to local storage', function(){
    user.save();
    var settings = JSON.parse(localStorage[STORAGE_SETTINGS_ID]);
    var user_id = JSON.parse(localStorage[STORAGE_USER_ID]);
    expect(settings).to.eql(user.settings);
    expect(user_id).to.eql(user.user);
  });

  it('alerts when not authenticated', function(){
    user.log();
    expect($window.alert).to.have.been.calledWith("Not authenticated, can't sync, go to settings first.");
  });

  it('puts items in que queue', function(){
    user.log({});
    //TODO where does that null comes from?
    expect(user.settings.sync.queue).to.eql([null, {}]);
  });
});