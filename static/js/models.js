$(document).ready(function() {
    var CSRF_TOKEN = $('meta[name="csrf-token"]').attr('content');
    var oldSync = Backbone.sync;
    Backbone.sync = function(method, model, options){
        options.beforeSend = function(xhr){
            xhr.setRequestHeader('X-CSRFToken', CSRF_TOKEN);
        };
        return oldSync(method, model, options);
    };

    function capitalize(string)
    {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function trim1 (str) {
        return str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }

    var Tweet = Backbone.Model.extend({
        idAttribute: 'pk'
    });

    var methodModel = Backbone.Model.extend({
        sync: function(method, model, options) {
            if (model.methodUrl && model.methodUrl[method.toLowerCase()]) {
                options = options || {};
                options.url = model.methodUrl[method.toLowerCase()];
            }
            Backbone.sync(method, model, options);
        }
    });

    var TweetReply = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/tweet_reply/' + this.id;
        },
        methodUrl: {
            'create': '/api/tweet_reply/'
        }
    });

    var EmailSubscription = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/subscribe/' + this.id;
        },
        methodUrl: {
            'create': '/api/subscribe/'
        }
    });


    var User = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/users/' + this.id;
        },
        methodUrl: {
            'create': '/api/users/'
        }
    });

    var Tweets = Backbone.Collection.extend({
        idAttribute: 'pk',
        model: Tweet,
        url: '/api/tweets/'
    });

    var Tag = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/tags/' + this.get('name') + "/";
        },
        methodUrl: {
            'create': '/api/tags/'
        }
    });

    var Tags = Backbone.Collection.extend({
        idAttribute: 'pk',
        model: Tag,
        url: '/api/tags/'
    });

    var Users = Backbone.Collection.extend({
        idAttribute: 'pk',
        model: User,
        url: '/api/users/'
    });

    var BaseView = Backbone.View.extend({
        destroy_view: function() {
            this.undelegateEvents();
            this.$el.removeData().unbind();
            this.remove();
            Backbone.View.prototype.remove.call(this);
        }
    });

    var UserView = BaseView.extend({
        tagName: "tr",
        className: "users",
        template_name: "#userTemplate",
        tag: null,
        events: {
        },
        initialize: function(options){
            _.bindAll(this, 'render'); // every function that uses 'this' as the current object should be in here
            this.tag = options.tag;
            this.model.bind('change', this.render);
            this.model.bind('remove', this.unrender);
        },
        get_model_json: function(){
            var model_json = this.model.toJSON();
            return model_json;
        },
        render: function () {
            var tmpl = _.template($(this.template_name).html());
            var model_json = this.get_model_json();
            var model_html = tmpl(model_json);

            $(this.el).html(model_html);
            return this;
        },
        destroy: function() {
            this.model.trigger('destroy', this.model, this.model.collection, {});
        },
        remove_el: function(){
            $(this.el).remove();
        }
    });

    var TagDetailView = BaseView.extend({
        el: "#dashboard-content",
        template_name: "#tagDetailTemplate",
        active: null,
        tag: null,
        options: null,
        user_view: null,
        tweet_view: null,
        tag_model: null,
        chart_tag: "tweet-chart",
        events: {

        },
        initialize: function (options) {
            _.bindAll(this, 'render', 'refresh');
            this.tag = options.tag;
            this.active = options.active;
            this.display_tag = options.display_tag;
            this.options = {
                tag: this.tag,
                active: this.active,
                display_tag: this.display_tag
            };
        },
        base_render: function() {
            this.tag_model = new Tag({name : this.tag});
            this.tag_model.fetch({async: false});
            var tmpl = _.template($(this.template_name).html());
            var tweets_by_day = [];
            var tweets_by_day_data = this.tag_model.get('tweet_count_by_day');
            for (var i = 0; i < tweets_by_day_data.length; i++) {
                tweets_by_day.push({created: tweets_by_day_data[i].created, count: tweets_by_day_data[i].created_count});
            }
            var content_html = tmpl({
                tag: this.tag,
                display_tag: this.display_tag,
                tweet_count: parseInt(this.tag_model.get('tweet_count')),
                tweet_count_today: parseInt(this.tag_model.get('tweet_count_today')),
                tweets_by_day: tweets_by_day
            });
            $("#tag-sidebar").find('li').removeClass("current active");
            $(this.active).addClass("current active");
            $(this.el).html(content_html);
            if(tweets_by_day.length > 1){
                var chart_width = $("#tweets").width();
                $('#' + this.chart_tag).css('width', chart_width);
                this.create_chart(tweets_by_day);
            }
        },
        create_chart: function(data){
            new Morris.Line({
                element: this.chart_tag,
                data: data,
                xkey: 'created',
                ykeys: ['count'],
                labels: ['# of tweets']
            });
        },
        render: function () {
            this.base_render();
            this.user_view = new UsersView(this.options);
            this.user_view.render();
            this.tweet_view = new TweetsView(this.options);
            this.tweet_view.render();
        },
        base_refresh: function() {
            this.base_render();
        },
        refresh: function(options){
            this.tag = options.tag;
            this.active = options.active;
            this.display_tag = options.display_tag;
            this.options = {
                tag: this.tag,
                active: this.active,
                display_tag: this.display_tag
            };
            $(this.el).empty();
            this.base_refresh();
            this.setElement($(this.el));
            this.user_view.refresh(this.options);
            this.tweet_view.refresh(this.options);
        }
    });

    var UsersView = BaseView.extend({
        el: "#user-table",
        el_name: "#user-table",
        collection_class : Users,
        view_class: UserView,
        template_name: "#userTableTemplate",
        tag: undefined,
        active: undefined,
        events: {
            'click #create-user': 'create_user',
            'click .user-tag-delete': 'user_tag_delete'
        },
        initialize: function (options) {
            _.bindAll(this, 'render', 'renderUser', 'refresh', 'render_table', 'create_user', 'destroy_view', 'error_display', 'success_display', 'user_tag_delete');
            this.collection = new this.collection_class();
            this.tag = options.tag;
            this.active = options.active;
            this.display_tag = options.display_tag;
            this.collection.fetch({async: false, data: {tag: this.tag}});
        },
        render_table: function(){
            this.render();
        },
        render: function () {
            var model_html = "";
            var that = this;
            if(this.collection.length > 0){
                _.each(this.collection.models, function (item) {
                    model_html = model_html + $(that.renderUser(item)).html();
                }, this);
            } else {
                model_html = $("#noUserTemplate").html()
            }
            var tmpl = _.template($(this.template_name).html());
            var content_html = tmpl({content: model_html, tag: this.tag, display_tag: this.display_tag});
            $(this.el).html(content_html);
            $('#create-user').unbind();
            $('.user-tag-delete').unbind();
            $('#create-user').click(this.create_user);
            $('.user-tag-delete').click(this.user_tag_delete);
            return this;
        },
        renderUser: function (item) {
            var userView = new this.view_class({
                model: item,
                tag: this.tag
            });
            return userView.render().el;
        },
        refresh: function(options){
            this.tag = options.tag;
            this.display_tag = options.display_tag;
            this.collection.fetch({async:false, data: {tag: this.tag}});
            this.setElement(this.el_name);
            $(this.el).empty();
            this.render_table();
        },
        error_display: function(model, xhr, options){
            $(".create-user-form").removeClass("has-success").addClass("has-error");
            $("#create-user-message").html("This username cannot be validated.  Is it an actual twitter screen name?");
        },
        success_display: function(model, response, options){
            $(".create-user-form").removeClass("has-error").addClass("has-success");
            $("#create-user-message").html("User added!  They will now show up in the feed for this tag.");
            this.refresh({tag : this.tag});
        },
        create_user: function(event){
            event.preventDefault();
            $(event.target).attr('disabled', true);
            var user_name = $("#inputTag1").val();
            if(user_name.charAt(0)=="@"){
                user_name = user_name.substring(1,user_name.length);
            }
            var user = new User({'tag' : this.tag, 'username' : user_name});
            user.save(null,{async: false, success : this.success_display, error: this.error_display});
            $("#create-user").attr('disabled', false);
            return false;
        },
        user_tag_delete: function(event){
            event.preventDefault();
            var twitter_name = $(event.target).closest('tr').find('td.screen-name').data('screen-name');
            var item_to_remove = this.collection.where({twitter_screen_name: twitter_name})[0];
            item_to_remove.destroy({data: {tag: this.tag}, processData: true, async: false});
            this.refresh({tag : this.tag});
            return false;
        }
    });

    var TagView = BaseView.extend({
        tagName: "tr",
        className: "tags",
        template_name: "#tagTemplate",
        events: {
        },
        initialize: function(){
            _.bindAll(this, 'render'); // every function that uses 'this' as the current object should be in here
            this.model.bind('change', this.render);
            this.model.bind('remove', this.unrender);
        },
        get_model_json: function(){
            var model_json = this.model.toJSON();
            model_json.modified = model_json.modified.split("T")[0];
            return model_json;
        },
        render: function () {
            var tmpl = _.template($(this.template_name).html());
            var model_json = this.get_model_json();
            var model_html = tmpl(model_json);

            $(this.el).html(model_html);
            return this;
        },
        destroy: function() {
            this.model.trigger('destroy', this.model, this.model.collection, {});
        },
        remove_el: function(){
            $(this.el).remove();
        }
    });

    var TagsView = BaseView.extend({
        el: "#tags",
        tag_item_el: "#tag-content",
        collection_class : Tags,
        view_class: TagView,
        initialize: function () {
            _.bindAll(this, 'render', 'renderTag', 'renderNone', 'refresh');
            this.collection = new this.collection_class();
            this.collection.fetch({async:false});
        },
        render_dash: function(){
            if(this.collection.length > 0){
                this.render();
            } else{
                this.renderNone();
            }
        },
        render: function () {
            var that = this;
            _.each(this.collection.models, function (item) {
                that.renderTag(item);
            }, this);
        },
        renderNone: function() {
            var add_tag_prompt = $("#addTagPromptTemplate").html();
            $(this.el).html(add_tag_prompt);
        },
        renderTag: function (item) {
            var tagView = new this.view_class({
                model: item
            });
            $(this.tag_item_el).append(tagView.render().el);
        },
        refresh: function(){
            this.collection.fetch({async:false});
            $(this.tag_item_el).empty();
            this.render_dash();
        }
    });

    var TagSidebarView = TagView.extend({
        tagName: "li",
        className: "tag-list-item",
        template_name: "#sidebarItemTemplate"
    });

    var TagsSidebarView = TagsView.extend({
        el: "#tag-sidebar",
        view_class: TagSidebarView,
        detail_view: undefined,
        events: {
            'click #refresh-sidebar': 'refresh',
            'click .tag-name' : 'render_tag_name'
        },
        render_sidebar: function(){
            $('.tag-name', this.el).remove();
            var that = this;
            _.each(this.collection.models, function (item) {
                that.renderTag(item);
            }, this);
        },
        refresh: function(event){
            event.preventDefault();
            this.collection.fetch({async:false});
            this.render_sidebar();
            return false;
        },
        render_tag_name: function(event){
            event.preventDefault();
            var options = {
                tag: $(event.target).data('tag-name'),
                active: $(event.target).parent(),
                display_tag:$(event.target).data('display-tag-name')
            };
            if(this.detail_view!=undefined){
                this.detail_view.refresh(options);
            } else {
                this.detail_view = new TagDetailView(options);
                this.detail_view.render();
            }
            return false;
        },
        renderTag: function (item) {
            var tagView = new this.view_class({
                model: item
            });
            $(this.el).append(tagView.render().el);
        }
    });

    var TweetView = BaseView.extend({
        tagName: "div",
        className: "tweets",
        events: {
        },
        initialize: function(){
            _.bindAll(this, 'render'); // every function that uses 'this' as the current object should be in here
            this.model.bind('change', this.render);
            this.model.bind('remove', this.unrender);
        },
        get_model_json: function(){
            var model_json = this.model.toJSON();
            model_json.created_at = model_json.created_at.replace("Z","");
            model_json.created_at = moment.utc(model_json.created_at).local().calendar();
            return model_json;
        },
        render: function () {
            var tmpl = _.template($("#tweetTemplate").html());
            var model_json = this.get_model_json();
            var model_html = tmpl(model_json);

            $(this.el).html(model_html);
            return this;
        },
        destroy: function() {
            this.model.trigger('destroy', this.model, this.model.collection, {});
        },
        remove_el: function(){
            $(this.el).remove();
        }
    });

    var TweetsView = BaseView.extend({
        el: "#tweets",
        el_name: "#tweets",
        collection_class : Tweets,
        view_class: TweetView,
        template_name: "#tweetsTemplate",
        tag: undefined,
        view_tweet_replies_tag: '.view-tweet-replies',
        reply_to_tweet: '.reply-to-tweet-button',
        open_reply_panel: '.reply-to-tweet',
        events: {
            'click .view-tweet-replies': this.render_tweet_replies,
            'click .reply-to-tweet': this.post_reply_to_tweet
        },
        initialize: function (options) {
            _.bindAll(this, 'render', 'renderTweet', 'refresh', 'render_tweets', 'destroy_view', 'render_tweet_replies', 'post_reply_to_tweet');
            this.collection = new this.collection_class();
            this.tag = options.tag;
            this.display_tag = options.display_tag;
            this.collection.fetch({async: false, data: {tag: this.tag}});
        },
        render_tweets: function(){
            this.render();
        },
        top_level_tweets: function(){
            var top_level = [];
            var i;
            var m;
            for(i=0; i<this.collection.models.length;i++){
                m = this.collection.models[i];
                var reply_to = m.get('reply_to');
                var retweet_of = m.get('retweet_of');
                if(reply_to == null && retweet_of == null){
                    top_level.push(m);
                }
            }
            return top_level
        },
        handle_reply_collapse: function(event){
          event.preventDefault();
        },
        post_reply_to_tweet: function(event){
            event.preventDefault();
            var button = $(event.target);
            var primary_key = button.data('primary-key');
            var reply = $('#reply-to-tweet-input-' + primary_key).val();
            console.log({in_reply_to_id : primary_key, tweet_text: reply, tag: this.tag});
            var tweet_reply = new TweetReply({in_reply_to_id : primary_key, tweet_text: reply, tag: this.tag});
            var tweet_div = $('#reply-to-tweet-' + primary_key);
            var reply_form = tweet_div.find('.reply-to-tweet-form');
            var message_block = tweet_div.find('.help-block');
            $(button).attr('disabled', true);
            tweet_reply.save(null,{
                success : function(){
                    $(reply_form).removeClass("has-error").addClass("has-success");
                    $(message_block).html("Reply sent!  It may take some time to show up here.");
                    $(button).attr('disabled', false);
                },
                error: function(){
                    $(reply_form).removeClass("has-success").addClass("has-error");
                    $(message_block).html("There was a problem sending your tweet.  Please try again later.");
                    $(button).attr('disabled', false);
                }
            });

            return false;
        },
        render_tweet_replies: function(event){
            event.preventDefault();
            var tweet_id = $(event.target).parent().data('tweet-id');
            var comment_container = $(event.target).parent().find('#tweet-replies-container-' + tweet_id);
            if(!comment_container.data('contains-replies')){
                var tweet_replies = this.child_tweets(tweet_id);
                if(tweet_replies.length > 0){
                    var that = this;
                    var model_html = "";
                    _.each(tweet_replies, function (item) {
                        model_html = model_html + $(that.renderTweet(item)).html();
                    }, this);
                    var tmpl = _.template($(this.template_name).html());
                    var content_html = tmpl({tweets: model_html, tag: this.tag, display_tag: this.display_tag});
                    $(comment_container).html(content_html);
                    comment_container.data('contains-replies', true);
                    this.rebind_events();
                } else {
                    var no_replies = $("#noRepliesTemplate").html();
                    $(comment_container).html(no_replies);
                }
            } else {
                $(comment_container).html('');
                comment_container.data('contains-replies', false);
            }
            return false;
        },
        rebind_events: function() {
            $(this.view_tweet_replies_tag).unbind();
            $(this.view_tweet_replies_tag).click(this.render_tweet_replies);
            $(this.reply_to_tweet).unbind();
            $(this.reply_to_tweet).click(this.post_reply_to_tweet);
            $(this.open_reply_panel).unbind();
            $(this.open_reply_panel).click(this.handle_reply_collapse);
        },
        child_tweets: function(tweet_id){
            tweet_id = parseInt(tweet_id);
            var children = [];
            var i;
            var m;
            for(i=0; i<this.collection.models.length;i++){
                m = this.collection.models[i];
                var reply_to = parseInt(m.get('reply_to'));
                var retweet_of = parseInt(m.get('retweet_of'));
                if(reply_to == tweet_id || retweet_of == tweet_id){
                    children.push(m);
                }
            }
            return children
        },
        render: function () {
            var model_html = "";
            var that = this;
            var top_level_tweets = this.top_level_tweets();
            if(this.collection.length > 0){
                _.each(top_level_tweets, function (item) {
                    model_html = model_html + $(that.renderTweet(item)).html();
                }, this);
            } else {
                var no_tmpl = _.template($("#noTweetsTemplate").html());
                model_html = no_tmpl({tag: this.tag, display_tag: this.display_tag});
            }
            var tmpl = _.template($(this.template_name).html());
            var content_html = tmpl({tweets: model_html, tag: this.tag, display_tag: this.display_tag});
            $(this.el).html(content_html);
            this.rebind_events();
        },
        renderTweet: function (item) {
            var userView = new this.view_class({
                model: item
            });
            return userView.render().el;
        },
        refresh: function(options){
            this.tag = options.tag;
            this.display_tag = options.display_tag;
            this.collection.fetch({async:false, data: {tag: this.tag}});
            this.setElement(this.el_name);
            $(this.el).empty();
            this.render_tweets();
        }
    });

    window.TweetsView = TweetsView;
    window.TweetView = TweetView;
    window.TagView = TagView;
    window.TagsView = TagsView;
    window.Tag = Tag;
    window.TagSidebarView = TagSidebarView;
    window.TagsSidebarView = TagsSidebarView;
    window.EmailSubscription = EmailSubscription;
});
