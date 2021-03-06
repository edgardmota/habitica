<template lang="pug">
div.item-with-icon.item-notifications.dropdown
  span.message-count.top-count(v-if='notificationsCount > 0')  {{ notificationsCount }}
  .svg-icon.notifications(v-html="icons.notifications")
  .dropdown-menu.dropdown-menu-right.user-dropdown
    h4.dropdown-item.dropdown-separated(v-if='!hasNoNotifications()') {{ $t('notifications') }}
    h4.dropdown-item.toolbar-notifs-no-messages(v-if='hasNoNotifications()') {{ $t('noNotifications') }}
    a.dropdown-item(v-if='user.party.quest && user.party.quest.RSVPNeeded')
      div {{ $t('invitedTo', {name: quests.quests[user.party.quest.key].text()}) }}
      div
        button.btn.btn-primary(@click='questAccept(user.party._id)') Accept
        button.btn.btn-primary(@click='questReject(user.party._id)') Reject
    a.dropdown-item(v-if='user.purchased.plan.mysteryItems.length', @click='go("/inventory/items")')
      span.glyphicon.glyphicon-gift
      span {{ $t('newSubscriberItem') }}
    a.dropdown-item(v-for='(party, index) in user.invitations.parties')
      div
        span.glyphicon.glyphicon-user
        span {{ $t('invitedTo', {name: party.name}) }}
      div
        button.btn.btn-primary(@click='accept(party, index, "party")') Accept
        button.btn.btn-primary(@click='reject(party, index, "party")') Reject
    a.dropdown-item(v-if='user.flags.cardReceived', @click='go("/inventory/items")')
      span.glyphicon.glyphicon-envelope
      span {{ $t('cardReceived') }}
      a.dropdown-item(@click='clearCards()', :popover="$t('clear')",
        popover-placement='right', popover-trigger='mouseenter', popover-append-to-body='true')
    a.dropdown-item(v-for='(guild, index) in user.invitations.guilds')
      div
        span.glyphicon.glyphicon-user
        span {{ $t('invitedTo', {name: guild.name}) }}
      div
        button.btn.btn-primary(@click='accept(guild, index, "guild")') Accept
        button.btn.btn-primary(@click='reject(guild, index, "guild")') Reject
    a.dropdown-item(v-if='user.flags.classSelected && !user.preferences.disableClasses && user.stats.points',
      @click='go("/user/profile")')
      span.glyphicon.glyphicon-plus-sign
      span {{ $t('haveUnallocated', {points: user.stats.points}) }}
    a.dropdown-item(v-for='message in userNewMessages')
      span(@click='navigateToGroup(message.key)')
        span.glyphicon.glyphicon-comment
        span {{message.name}}
      span.clear-button(@click='clearMessages(message.key)', :popover="$t('clear')",
        popover-placement='right', popover-trigger='mouseenter', popover-append-to-body='true') Clear
    a.dropdown-item(v-for='(notification, index) in user.groupNotifications', @click='viewGroupApprovalNotification(notification, index, true)')
      span(:class="groupApprovalNotificationIcon(notification)")
      span
        | {{notification.data.message}}
      a.dropdown-item(@click='viewGroupApprovalNotification(notification, $index)',
        :popover="$t('clear')",
        popover-placement='right',
        popover-trigger='mouseenter',
        popover-append-to-body='true')
        span.glyphicon.glyphicon-remove-circle
</template>

<style lang='scss' scoped>
  @import '~client/assets/scss/colors.scss';

  .message-count {
    background-color: $blue-50;
    border-radius: 50%;
    height: 20px;
    width: 20px;
    float: right;
    color: $white;
    text-align: center;
    font-weight: bold;
    font-size: 12px;
  }

  .message-count.top-count {
    position: absolute;
    right: -.5em;
    top: .5em;
    padding: .2em;
    background-color: $red-50;
  }

  .clear-button {
    margin-left: .5em;
  }

  .item-notifications {
    width: 44px;
  }

  .item-notifications:hover {
    cursor: pointer;
  }

  .notifications {
    color: $header-color;
    vertical-align: bottom;
    display: inline-block;
    width: 20px;
    height: 20px;
    margin-right: 8px;
    margin-left: 8px;
    margin-top: .2em;
  }

  .item-with-icon:hover {
    .svg-icon {
      color: $white;
    }
  }

  .user-dropdown {
    max-height: 350px;
    overflow: auto;
  }

  /* @TODO: Move to shared css */
  .dropdown:hover .dropdown-menu {
    display: block;
    margin-top: 0; // remove the gap so it doesn't close
  }

  .dropdown + .dropdown {
    margin-left: 0px;
  }

  .dropdown-separated {
    border-bottom: 1px solid $gray-500;
  }

  .dropdown-menu:not(.user-dropdown) {
    background: $purple-200;
    border-radius: 0px;
    border: none;
    box-shadow: none;
    padding: 0px;

    border-bottom-right-radius: 5px;
    border-bottom-left-radius: 5px;

    .dropdown-item {
      font-size: 16px;
      box-shadow: none;
      color: $white;
      border: none;
      line-height: 1.5;

      &.active {
        background: $purple-300;
      }

      &:hover {
        background: $purple-300;

        &:last-child {
          border-bottom-right-radius: 5px;
          border-bottom-left-radius: 5px;
        }
      }
    }
  }
</style>

<script>
import isEmpty from 'lodash/isEmpty';
import map from 'lodash/map';

import { mapState } from 'client/libs/store';
import * as Analytics from 'client/libs/analytics';
import quests from 'common/script/content/quests';
import notificationsIcon from 'assets/svg/notifications.svg';

export default {
  data () {
    return {
      icons: Object.freeze({
        notifications: notificationsIcon,
      }),
      quests,
    };
  },
  computed: {
    ...mapState({user: 'user.data'}),
    party () {
      return {name: ''};
      // return this.user.party;
    },
    userNewMessages () {
      // @TODO: For some reason data becomes corrupted. We should fix this on the server
      let userNewMessages = [];
      for (let key in this.user.newMessages) {
        let message = this.user.newMessages[key];
        if (message && message.name && message.value) {
          message.key = key;
          userNewMessages.push(message);
        }
      }
      return userNewMessages;
    },
    notificationsCount () {
      let count = 0;

      if (this.user.invitations.parties) {
        count += this.user.invitations.parties.length;
      }

      if (this.user.purchased.plan && this.user.purchased.plan.mysteryItems.length) {
        count++;
      }

      if (this.user.invitations.guilds) {
        count += this.user.invitations.guilds.length;
      }

      if (this.user.flags.classSelected && !this.user.preferences.disableClasses && this.user.stats.points) {
        count += this.user.stats.points > 0 ? 1 : 0;
      }

      if (this.userNewMessages) {
        count += Object.keys(this.userNewMessages).length;
      }

      return count;
    },
  },
  methods: {
    // @TODO: I hate this function, we can do better with a hashmap
    selectNotificationValue (mysteryValue, invitationValue, cardValue,
      unallocatedValue, messageValue, noneValue, groupApprovalRequested, groupApproved) {
      let user = this.user;

      if (user.purchased && user.purchased.plan && user.purchased.plan.mysteryItems && user.purchased.plan.mysteryItems.length) {
        return mysteryValue;
      } else if (user.invitations.parties && user.invitations.parties.length > 0 || user.invitations.guilds && user.invitations.guilds.length > 0) {
        return invitationValue;
      } else if (user.flags.cardReceived) {
        return cardValue;
      } else if (user.flags.classSelected && !(user.preferences && user.preferences.disableClasses) && user.stats.points) {
        return unallocatedValue;
      } else if (!isEmpty(user.newMessages)) {
        return messageValue;
      } else if (!isEmpty(user.groupNotifications)) {
        let groupNotificationTypes = map(user.groupNotifications, 'type');
        if (groupNotificationTypes.indexOf('GROUP_TASK_APPROVAL') !== -1) {
          return groupApprovalRequested;
        } else if (groupNotificationTypes.indexOf('GROUP_TASK_APPROVED') !== -1) {
          return groupApproved;
        }
        return noneValue;
      } else {
        return noneValue;
      }
    },
    hasQuestProgress () {
      let user = this.user;
      if (user.party.quest) {
        let userQuest = quests[user.party.quest.key];

        if (!userQuest) {
          return false;
        }
        if (userQuest.boss && user.party.quest.progress.up > 0) {
          return true;
        }
        if (userQuest.collect && user.party.quest.progress.collectedItems > 0) {
          return true;
        }
      }
      return false;
    },
    getQuestInfo () {
      let user = this.user;
      let questInfo = {};
      if (user.party.quest) {
        let userQuest = quests[user.party.quest.key];

        questInfo.title = userQuest.text();

        if (userQuest.boss) {
          questInfo.body =  this.$t('questTaskDamage', { damage: user.party.quest.progress.up.toFixed(1) });
        } else if (userQuest.collect) {
          questInfo.body = this.$t('questTaskCollection', { items: user.party.quest.progress.collectedItems });
        }
      }
      return questInfo;
    },
    clearMessages (key) {
      this.$store.dispatch('chat:markChatSeen', {groupId: key});
      this.$delete(this.user.newMessages, key);
    },
    clearCards () {
      this.$store.dispatch('chat:clearCards');
    },
    iconClasses () {
      return this.selectNotificationValue(
        'glyphicon-gift',
        'glyphicon-user',
        'glyphicon-envelope',
        'glyphicon-plus-sign',
        'glyphicon-comment',
        'glyphicon-comment inactive',
        'glyphicon-question-sign',
        'glyphicon-ok-sign'
      );
    },
    hasNoNotifications () {
      return this.selectNotificationValue(false, false, false, false, false, true, false, false);
    },
    viewGroupApprovalNotification (notification, index, navigate) {
      // @TODO: USe notifications: User.readNotification(notification.id);
      this.user.groupNotifications.splice(index, 1);
      return navigate; // @TODO: remove
      // @TODO: this.$router.go if (navigate) go('options.social.guilds.detail', {gid: notification.data.groupId});
    },
    groupApprovalNotificationIcon (notification) {
      if (notification.type === 'GROUP_TASK_APPROVAL') {
        return 'glyphicon glyphicon-question-sign';
      } else if (notification.type === 'GROUP_TASK_APPROVED') {
        return 'glyphicon glyphicon-ok-sign';
      }
    },
    go (path) {
      this.$router.push(path);
    },
    navigateToGroup (key) {
      if (key === this.party._id || key === this.user.party._id) {
        this.go('/party');
        return;
      }

      this.$router.push({ name: 'guild', params: { groupId: key }});
    },
    async reject (group) {
      await this.$store.dispatch('guilds:rejectInvite', {groupId: group.id});
      // @TODO: User.sync();
    },
    async accept (group, index, type) {
      if (group.cancelledPlan && !confirm(this.$t('aboutToJoinCancelledGroupPlan'))) {
        return;
      }

      if (type === 'party') {
        // @TODO: pretty sure mutability is wrong. Need to check React docs
        // @TODO mutation to store data should only happen through actions
        this.user.invitations.parties.splice(index, 1);

        Analytics.updateUser({partyID: group.id});
      } else {
        this.user.invitations.guilds.splice(index, 1);
      }

      if (type === 'party') {
        this.user.party._id = group.id;
        this.$router.push('/party');
      } else {
        this.user.guilds.push(group.id);
        this.$router.push(`/groups/guild/${group.id}`);
      }

      // @TODO: check for party , type: 'myGuilds'
      await this.$store.dispatch('guilds:join', {guildId: group.id});
    },
    async questAccept (partyId) {
      let quest = await this.$store.dispatch('quests:sendAction', {groupId: partyId, action: 'quests/accept'});
      this.user.party.quest = quest;
    },
    async questReject (partyId) {
      let quest = await this.$store.dispatch('quests:sendAction', {groupId: partyId, action: 'quests/reject'});
      this.user.party.quest = quest;
    },
  },
};
</script>
