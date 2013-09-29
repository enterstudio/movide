$(document).ready(function() {
    var CSRF_TOKEN = $('meta[name="csrf-token"]').attr('content');
    var oldSync = Backbone.sync;
    Backbone.sync = function(method, model, options){
        options.beforeSend = function(xhr){
            xhr.setRequestHeader('X-CSRFToken', CSRF_TOKEN);
        };
        return oldSync(method, model, options);
    };

    function csrfSafeMethod(method) {
        return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
    }
    function sameOrigin(url) {
        var host = document.location.host; // host + port
        var protocol = document.location.protocol;
        var sr_origin = '//' + host;
        var origin = protocol + sr_origin;
        return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
            (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
            !(/^(\/\/|http:|https:).*/.test(url));
    }

    jQuery.extend({
        getValues: function(url, data) {
            var result = null;
            $.ajax({
                url: url,
                type: 'get',
                async: false,
                data: data,
                success: function(data) {
                    result = data;
                }
            });
            return result;
        }
    });

    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
                xhr.setRequestHeader("X-CSRFToken", CSRF_TOKEN);
            }
        }
    });

    function post_code(data, success, error){
        $.ajax({
            type: "POST",
            url: "/verify_code/",
            data: data,
            success: success,
            error: error
        });
    }

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

    function get_message_notifications(data, success, error){
        $.ajax({
            url: "/api/messages/notifications/",
            data: data,
            success: success,
            error: error
        });
    }

    var methodModel = Backbone.Model.extend({
        sync: function(method, model, options) {
            if (model.methodUrl && model.methodUrl[method.toLowerCase()]) {
                options = options || {};
                options.url = model.methodUrl[method.toLowerCase()];
            }
            Backbone.sync(method, model, options);
        }
    });

    var PaginatedCollection = Backbone.Collection.extend({
        max_time: undefined,
        initialize: function() {
            _.bindAll(this, 'parse', 'nextPage', 'previousPage');
            typeof(options) != 'undefined' || (options = {});
        },
        fetch: function(options) {
            typeof(options) != 'undefined' || (options = {});
            this.trigger("fetching");
            var self = this;
            var success = options.success;
            options.success = function(resp) {
                self.trigger("fetched");
                if(success) { success(self, resp); }
            };
            return Backbone.Collection.prototype.fetch.call(this, options);
        },
        parse: function(resp) {
            this.next = resp.next;
            this.prev = resp.previous;
            var max_timestamp = _.max(resp.results, function(r){return parseInt(r.created_timestamp);});
            if(this.max_time == undefined || max_timestamp.created_timestamp > this.max_time){
                this.max_time = max_timestamp.created_timestamp;
            }
            return resp.results;
        },
        nextPage: function(options) {
            if (this.next == undefined || this.next == null) {
                return false;
            }
            this.url = this.next;
            return this.fetch(options);
        },
        previousPage: function(options) {
            if (this.prev == undefined || this.prev == null) {
                return false;
            }
            this.url = this.prev;
            return this.fetch(options);
        }

    });

    var ClassgroupStats = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/classes/' + this.get('name') + "/stats/";
        }
    });

    var Message = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/messages/' + this.id + "/";
        },
        methodUrl: {
            'create': '/api/messages/'
        },
        defaults: {
            notification_text: "",
            notification_created_formatted: ""
        }
    });

    var Resource = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/resources/' + this.id + "/";
        },
        methodUrl: {
            'create': '/api/resources/'
        }
    });

    var Resources = PaginatedCollection.extend({
        idAttribute: 'pk',
        model: Resource,
        baseUrl: '/api/resources/?page=1',
        url: '/api/resources/?page=1',
        comparator: function(m) {
            return -parseInt(m.get('created_timestamp'));
        }
    });

    var EmailSubscription = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/subscribe/' + this.id + "/";
        },
        methodUrl: {
            'create': '/api/subscribe/'
        }
    });

    var Rating = methodModel.extend({
        idAttribute: 'pk',
        url: '/api/ratings/'
    });


    var User = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/users/' + this.id + "/";
        },
        methodUrl: {
            'create': '/api/users/'
        }
    });

    var Messages = PaginatedCollection.extend({
        idAttribute: 'pk',
        model: Message,
        baseUrl: '/api/messages/?page=1',
        url: '/api/messages/?page=1',
        comparator: function(m) {
            return -parseInt(m.get('created_timestamp'));
        }
    });

    var Notifications = Messages.extend({
        baseUrl: '/api/notifications/?page=1',
        url: '/api/notifications/?page=1',
        comparator: function(m) {
            return -parseInt(m.get('notification_created_timestamp'));
        }
    });

    var ChildMessages = Backbone.Collection.extend({
        idAttribute: 'pk',
        model: Message,
        url: '/api/messages/'
    });

    var Class = methodModel.extend({
        idAttribute: 'pk',
        url: function () {
            return '/api/classes/' + this.get('name') + "/";
        },
        methodUrl: {
            'create': '/api/classes/'
        }
    });

    var Classes = Backbone.Collection.extend({
        idAttribute: 'pk',
        model: Class,
        url: '/api/classes/'
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
            this.classgroup = options.classgroup;
            this.model.bind('change', this.render);
            this.model.bind('remove', this.unrender);
            this.is_owner = $("#classinfo").data("is-owner");
        },
        get_model_json: function(){
            var model_json = this.model.toJSON();
            return model_json;
        },
        render: function () {
            var tmpl = _.template($(this.template_name).html());
            var model_json = this.get_model_json();
            model_json.is_owner = this.is_owner;
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

    var StatsView = BaseView.extend({
        el: "#stats-container",
        el_name: "#stats-container",
        chart_tag: "message-chart",
        network_chart_tag: "student-network-chart",
        events: {
        },
        initialize: function (options) {
            _.bindAll(this, 'render', 'create_daily_activity_chart', 'create_network_chart', 'render_charts');
            this.classgroup = options.classgroup;
            this.display_tag = options.display_tag;
            this.options = {
                classgroup: this.classgroup,
                display_tag: this.display_tag
            };
        },
        render: function(){
             var class_stats = new ClassgroupStats({name : this.classgroup});
             class_stats.fetch({success: this.render_charts, error: this.render_charts_error});
        },
        render_charts: function(model, success, options){
            var messages_by_day = [];
            var messages_by_day_data = model.get('message_count_by_day');
            for (var i = 0; i < messages_by_day_data.length; i++) {
                messages_by_day.push({created: messages_by_day_data[i].created_date, count: messages_by_day_data[i].created_count});
            }
            var network_info = model.get('network_info');
            if(messages_by_day.length > 1){
                this.create_daily_activity_chart(messages_by_day);
            } else {
                $("#" + this.chart_tag).html($('#noDailyActivityChartTemplate').html())
            }
            if(network_info.nodes.length > 2 && network_info.edges.length > 1){
                this.create_network_chart(network_info)
            } else {
                $("#" + this.network_chart_tag).html($('#noNetworkChartTemplate').html());
            }

        },
        create_daily_activity_chart: function(data){
            new Morris.Line({
                element: this.chart_tag,
                data: data,
                xkey: 'created',
                ykeys: ['count'],
                labels: ['# of messages']
            });
        },
        render_charts_error: function(){
            console.log("error");
        },
        create_network_chart: function(network_info){
            var sigInst = sigma.init(document.getElementById(this.network_chart_tag)).drawingProperties({
                defaultLabelColor: '#fff'
            }).graphProperties({
                    minNodeSize: 1,
                    maxNodeSize: 5,
                    minEdgeSize: 1,
                    maxEdgeSize: 5
                }).mouseProperties({
                    maxRatio: 4
                });

            var i;
            var clusters = [{
                'id': 1,
                'nodes': [],
                'color': 'rgb('+0+','+
                    0+','+
                    0+')'
            }];

            var cluster = clusters[0];
            var nodes = network_info.nodes;
            var edges = network_info.edges;
            var palette = colorbrewer.Paired[9];
            for(i=0;i<nodes.length;i++){
                var node = nodes[i];
                sigInst.addNode(node.name,{
                    'x': Math.random(),
                    'y': Math.random(),
                    'size': node.size,
                    'color': palette[(Math.random()*palette.length|0)],
                    'cluster': cluster['id'],
                    'label': node.name
                });
                cluster.nodes.push(node.name);
            }

            for(i = 0; i < edges.length; i++){
                var edge = edges[i];
                sigInst.addEdge(i,edge.start, edge.end, {'size' : 'strength'});
            }

            var greyColor = '#FFFFFF';
            sigInst.bind('overnodes',function(event){
                var nodes = event.content;
                var neighbors = {};
                sigInst.iterEdges(function(e){
                    if(nodes.indexOf(e.source)<0 && nodes.indexOf(e.target)<0){
                        if(!e.attr['grey']){
                            e.attr['true_color'] = e.color;
                            e.color = greyColor;
                            e.attr['grey'] = 1;
                        }
                    }else{
                        e.color = e.attr['grey'] ? e.attr['true_color'] : e.color;
                        e.attr['grey'] = 0;

                        neighbors[e.source] = 1;
                        neighbors[e.target] = 1;
                    }
                }).iterNodes(function(n){
                        if(!neighbors[n.id]){
                            if(!n.attr['grey']){
                                n.attr['true_color'] = n.color;
                                n.color = greyColor;
                                n.attr['grey'] = 1;
                            }
                        }else{
                            n.color = n.attr['grey'] ? n.attr['true_color'] : n.color;
                            n.attr['grey'] = 0;
                        }
                    }).draw(2,2,2);
            }).bind('outnodes',function(){
                    sigInst.iterEdges(function(e){
                        e.color = e.attr['grey'] ? e.attr['true_color'] : e.color;
                        e.attr['grey'] = 0;
                    }).iterNodes(function(n){
                            n.color = n.attr['grey'] ? n.attr['true_color'] : n.color;
                            n.attr['grey'] = 0;
                        }).draw(2,2,2);
                });

            sigInst.startForceAtlas2();
            setTimeout(function(){sigInst.stopForceAtlas2();}, 1500);
        }
    });

    var ClassDetailView = BaseView.extend({
        el: "#dashboard-content",
        classgroup: null,
        options: null,
        user_view: null,
        message_view: null,
        tag_model: null,
        chart_tag: "message-chart",
        network_chart_tag: "student-network-chart",
        template_name: "#classDetailTemplate",
        sidebar_item_tag: ".sidebar-item",
        events: {
        },
        initialize: function (options) {
            _.bindAll(this, 'render', 'refresh', 'make_active');
            this.classgroup = options.classgroup;
            this.display_tag = options.display_tag;
            this.options = {
                classgroup: this.classgroup,
                display_tag: this.display_tag
            };
            this.is_owner= $("#classinfo").data('is-owner');
        },
        make_active: function(elem){
            $("#tag-sidebar").find('li').removeClass("current active");
            $(elem).addClass("current active");
        },
        base_render: function() {
            this.class_model = new Class({name : this.classgroup});
            this.class_model.fetch({async: false});
            $(this.el).html("");
            this.rebind_events();
        },
        render_users: function() {
            this.refresh();
            $(this.el).html($("#usersDetailTemplate").html());
            this.user_view = new UsersView(this.options);
            this.user_view.render();
        },
        render_messages: function() {
            this.refresh();
            var tmpl = _.template($("#messageDetailTemplate").html());
            $(this.el).html(tmpl({
                is_owner: this.is_owner,
                enable_posting: this.class_model.get('class_settings').enable_posting
            }));
            this.message_view = new MessagesView(this.options);
            this.message_view.render();
        },
        render_stats: function() {
            this.refresh();
            $(this.el).html($("#statsDetailTemplate").html());
            this.stats_view = new StatsView(this.options);
            this.stats_view.render();
        },
        render_notifications: function(){
            this.refresh();
            $(this.el).html($("#notificationDetailTemplate").html());
            this.notifications_view = new NotificationsView(this.options);
            this.notifications_view.render();
        },
        render_settings: function(){
            this.refresh();
            $(this.el).html($("#settingsDetailTemplate").html());
            this.settings_view = new SettingsView(this.options);
            this.settings_view.render();
        },
        render_resources: function(){
            this.refresh();
            $(this.el).html($("#resourceDetailTemplate").html());
            this.resources_view = new ResourcesView(this.options);
            this.resources_view.render();
        },
        render_home: function(){
            this.refresh();
            var tmpl = _.template($("#homeDetailTemplate").html());
            $(this.el).html(tmpl(this.class_model.toJSON()));
            this.announcements_view = new AnnouncementsView(this.options);
            this.announcements_view.render();
        },
        render: function () {
            this.base_render();
            this.active_page = $("#classinfo").data("active-page");
            if(this.active_page == "messages"){
                this.render_messages();
            } else if(this.active_page == "stats"){
                this.render_stats();
            } else if(this.active_page == "users"){
                this.render_users();
            } else if(this.active_page == "notifications"){
                this.render_notifications();
            } else if(this.active_page == "settings"){
                this.render_settings();
            } else if(this.active_page == "home"){
                this.render_home();
            } else if(this.active_page == "resources"){
                this.render_resources();
            }
        },
        refresh: function(){
            $(this.el).empty();
            this.base_render();
            this.setElement($(this.el));
        },
        rebind_events: function() {
            $(this.sidebar_item_tag).unbind();
            $(this.sidebar_item_tag).click(this.sidebar_click);
        }
    });

    var UsersView = BaseView.extend({
        el: "#users-container",
        el_name: "#users-container",
        collection_class : Users,
        view_class: UserView,
        template_name: "#userTableTemplate",
        user_add_message: "#user-add-message",
        classgroup: undefined,
        active: undefined,
        events: {
            'click .user-tag-delete': 'user_tag_delete',
            'click #user-add': 'user_add'
        },
        initialize: function (options) {
            _.bindAll(this, 'render', 'renderUser', 'refresh', 'render_table',
                'destroy_view', 'user_tag_delete', 'rebind_events', 'user_add', 'display_message');
            this.collection = new this.collection_class();
            this.classgroup = options.classgroup;
            this.active = options.active;
            this.display_tag = options.display_tag;
            this.collection.fetch({async: false, data: {classgroup: this.classgroup}});
            this.is_owner = $("#classinfo").data("is-owner");
            this.access_key = $("#classinfo").data("access-key");
            this.link = window.location.host + $("#classinfo").data("class-link");
            this.user_add_link = $("#classinfo").data("class-link") + "add_user/";
            this.user_remove_link = $("#classinfo").data("class-link") + "remove_user/";
            this.options={
                classgroup: this.classgroup,
                display_tag: this.display_tag
            }
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
            var content_html = tmpl({
                content: model_html,
                classgroup: this.classgroup,
                display_tag: this.display_tag,
                is_owner: this.is_owner
            });

            $(this.el).html(content_html);
            this.rebind_events();
            return this;
        },
        rebind_events: function(){
            $('.user-tag-delete').unbind();
            $('.user-tag-delete').click(this.user_tag_delete);
            $('#user-add').unbind();
            $('#user-add').click(this.user_add);
        },
        display_message: function(message, success){
            this.refresh(this.options);
            var user_add_message = $(this.user_add_message);
            user_add_message.html(message);
            var user_add_form = user_add_message.closest('.form-group');
            if(success == true){
                user_add_form.removeClass('has-error').addClass('has-success');
            } else {
                user_add_form.removeClass('has-success').addClass('has-error');
            }
        },
        user_add: function(event){
            event.preventDefault();
            var user_to_add = $('.user-add-form').find("input").val();
            var that = this;
            $.ajax({
                type: "POST",
                url: this.user_add_link,
                data: {username: user_to_add},
                success: function(){
                    that.display_message("User added.", true);
                },
                error: function(){
                    that.display_message("Failed to add user.", false);
                }
            });
            return false;
        },
        renderUser: function (item) {
            var userView = new this.view_class({
                model: item,
                classgroup: this.classgroup
            });
            return userView.render().el;
        },
        refresh: function(options){
            this.classgroup = options.classgroup;
            this.display_tag = options.display_tag;
            this.collection.fetch({async:false, data: {classgroup: this.classgroup}});
            this.setElement(this.el_name);
            $(this.el).empty();
            this.render_table();
        },
        user_tag_delete: function(event){
            event.preventDefault();
            var username = $(event.target).closest('tr').find('td.username').data('username');
            var that = this;
            bootbox.confirm("Are you sure you want to delete this user?  They will be removed from the class immediately, but their posts will remain.", function(result) {
                if(result==true){
                    $.ajax({
                        type: "POST",
                        url: that.user_remove_link,
                        data: {username: username},
                        success: function(){
                            that.display_message("User removed.", true);
                        },
                        error: function(){
                            that.display_message("Failed to remove user.", false);
                        }
                    });
                }
            });
            return false;
        }
    });

    var ClassView = BaseView.extend({
        tagName: "tr",
        className: "classes",
        template_name: "#classTemplate",
        role: undefined,
        events: {
        },
        initialize: function(options){
            _.bindAll(this, 'render'); // every function that uses 'this' as the current object should be in here
            this.role = options.role;
            this.model.bind('change', this.render);
            this.model.bind('remove', this.unrender);
        },
        get_model_json: function(){
            var model_json = this.model.toJSON();
            model_json.modified = model_json.modified.split("T")[0];
            model_json.role = this.role;
            return model_json;
        },
        render: function () {
            var tmpl = _.template($(this.template_name).html());
            var model_json = this.get_model_json();
            var model_html = tmpl(model_json);

            $(this.el).html(model_html);
            if (window.location.pathname === model_json.link){
                $(this.el).addClass("active");
            }
            return this;
        },
        destroy: function() {
            this.model.trigger('destroy', this.model, this.model.collection, {});
        },
        remove_el: function(){
            $(this.el).remove();
        }
    });

    var ClassesView = BaseView.extend({
        el: "#classes",
        class_item_el: "#class-content",
        collection_class : Classes,
        view_class: ClassView,
        initialize: function () {
            _.bindAll(this, 'render', 'renderClass', 'renderNone', 'refresh');
            this.collection = new this.collection_class();
            this.collection.fetch({async:false});
            this.is_owner = $("#classinfo").data("is-owner");
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
                that.renderClass(item);
            }, this);
        },
        renderNone: function() {
            var add_tag_prompt = $("#addClassPromptTemplate").html();
            $(this.el).html(add_tag_prompt);
        },
        renderClass: function (item) {
            var username = $('.class-list').data('username');
            var role;
            if(item.get('owner') == username){
                role = "Creator"
            } else {
                role = "Participant"
            }
            var tagView = new this.view_class({
                model: item,
                role: role
            });
            $(this.class_item_el).append(tagView.render().el);
        },
        refresh: function(){
            this.collection.fetch({async:false});
            $(this.class_item_el).empty();
            this.render_dash();
        }
    });

    var MessageView = BaseView.extend({
        tagName: "div",
        className: "messages",
        template_name: "#messageTemplate",
        events: {
        },
        initialize: function(){
            _.bindAll(this, 'render');
            this.model.bind('change', this.render);
            this.model.bind('remove', this.unrender);
            this.class_owner = $("#classinfo").data('class-owner');
            this.is_owner = $("#classinfo").data('is-owner');
        },
        get_model_json: function(){
            var model_json = this.model.toJSON();
            model_json.created_formatted = model_json.created.replace("Z","");
            model_json.created_formatted = moment.utc(model_json.created_formatted).local().fromNow();
            model_json.written_by_owner = (this.class_owner == model_json.user);
            model_json.is_owner = this.is_owner;
            if(model_json.notification_created != undefined){
                model_json.notification_created_formatted = model_json.notification_created.replace("Z","");
                model_json.notification_created_formatted = moment.utc(model_json.notification_created_formatted).local().fromNow();
            }
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

    var MessagesView = BaseView.extend({
        el: "#messages-container",
        el_name: "#messages-container",
        collection_class : Messages,
        view_class: MessageView,
        template_name: "#messagesTemplate",
        classgroup: undefined,
        view_reply_panel: '.view-reply-panel',
        reply_to_message: '.reply-to-message-button',
        start_a_discussion: '.start-a-discussion-button',
        start_a_discussion_input: '#start-a-discussion-input',
        delete_a_message: '.delete-message-button',
        like_a_message_button: '.like-message-button',
        isLoading: false,
        interval_id: undefined,
        show_more_messages_container: "#show-more-messages-container",
        show_more_messages_template: "#showMoreMessagesTemplate",
        show_more_messages_button: "#show-more-messages-button",
        autocomplete_enabled_input: ".autocomplete-enabled-input",
        stop_polling: false,
        message_count: 0,
        document_title: document.title,
        enable_refresh: true,
        no_message_template_name: "#noMessagesTemplate",
        additional_filter_parameters: undefined,
        enable_infinite_scroll: true,
        events: {
            'click .view-reply-panel': this.render_reply_panel,
            'click .reply-to-message-button': this.post_reply_to_message,
            'click .start-a-discussion-button': this.post_reply_to_message,
            'click .reply-to-message': this.handle_reply_collapse,
            'click #show-more-messages-button': this.self_refresh,
            'click .delete-message-button': this.delete_message,
            'click .like-message-button': this.like_message
        },
        initialize: function (options) {
            _.bindAll(this, 'render', 'renderMessage', 'refresh', 'render_messages',
                'destroy_view', 'render_message_replies', 'render_reply_panel', 'post_reply_to_message',
                'checkScroll', 'show_message_notification', 'self_refresh', 'delete_message', 'like_message'
            );
            this.collection = new this.collection_class();
            this.classgroup = options.classgroup;
            this.display_tag = options.display_tag;
            this.fetch_data = {classgroup: this.classgroup};
            if(this.additional_filter_parameters != undefined){
                this.fetch_data= $.extend({}, this.additional_filter_parameters, this.fetch_data)
            }

            this.collection.fetch({async: false, data: this.fetch_data});
            this.rebind_collection();
            this.is_owner = $("#classinfo").data("is-owner");
            this.access_key = $("#classinfo").data("access-key");
            this.link = window.location.host + $("#classinfo").data("class-link");
            this.autocomplete_list = JSON.parse($('#autocomplete-list').html());
        },
        render_messages: function(){
            this.render();
        },
        top_level_messages: function(){
            var top_level = [];
            var i;
            var m;
            for(i=0; i<this.collection.models.length;i++){
                m = this.collection.models[i];
                var reply_to = m.get('reply_to');
                if(reply_to == null){
                    top_level.push(m);
                }
            }
            return top_level
        },
        like_message: function(event){
            event.preventDefault();
            var button = $(event.target);
            var comment = button.closest('.comment');
            var message_id = comment.data('message-id');
            var rating = new Rating({'message' : message_id, 'rating': 1});
            button.parent().attr('disabled', true);
            rating.save({}, {
                success: function(){

                }
            });
            return false;
        },
        delete_message: function(event){
            event.preventDefault();
            var that = this;
            var comment = $(event.target).closest('.comment');
            var message_id = comment.data('message-id');
            bootbox.confirm("Are you sure you want to delete this post?  You will not be able to see it afterwards.", function(result) {
                if(result==true){
                    var message = new Message({'pk' : message_id});
                    message.destroy();
                    comment.remove();
                }
            });
            return false;
        },
        post_reply_to_message: function(event){
            event.preventDefault();
            var button = $(event.target);
            var message_div = button.closest("div.message-reply");
            var reply = message_div.find("textarea").val();
            var message_reply;
            var start_discussion;
            if(message_div.data('start-discussion') == true){
                var message_type = "D";
                if(this.is_owner==true){
                    var checked = message_div.find('#make-discussion-announcement-input').is(":checked");
                    if(checked==true){
                        message_type = "A";
                    }
                }
                start_discussion = true;
                message_reply = new Message({text: reply, classgroup: this.classgroup,  source: 'website', message_type: message_type})
            } else {
                start_discussion = false;
                var primary_key = button.closest('.reply-panel').data('message-id');
                message_reply = new Message({reply_to : primary_key, text: reply, classgroup: this.classgroup, source: 'website'});
            }

            var reply_form = message_div.find('.reply-to-message-form');
            var message_block = message_div.find('.help-block');
            $(button).attr('disabled', true);
            var that = this;
            message_reply.save(null,{
                success : function(){
                    $(reply_form).removeClass("has-error").addClass("has-success");
                    $(message_block).html("Discussion started! You may need to reload the page to see it.");
                    $(button).attr('disabled', false);
                    if(start_discussion == true){
                        that.collection.fetch({async: false, data: that.fetch_data});
                    } else {
                        that.render_message_replies(primary_key);
                    }
                    that.rebind_events();
                },
                error: function(){
                    $(reply_form).removeClass("has-success").addClass("has-error");
                    $(message_block).html("There was a problem sending your message.  Please try again later.");
                    $(button).attr('disabled', false);
                },
                async: false
            });

            return false;
        },
        render_message_replies: function(message_id){
            var message_replies = this.child_messages(message_id);
            var model_html;
            if(message_replies.length > 0){
                var that = this;
                model_html = "";
                _.each(message_replies, function (item) {
                    model_html = model_html + $(that.renderMessage(item)).html();
                }, this);
            } else {
                model_html = $("#noRepliesTemplate").html();
            }
            var comment_container = $('#message-replies-container-' + message_id);
            $(comment_container).html(model_html);
        },
        render_reply_panel: function(event){
            event.preventDefault();
            var parent = $(event.target).closest('.comment');
            var message_id = parent.data('message-id');
            var reply_panel = parent.find("#reply-panel-" + message_id);
            var reply_container = parent.find('#reply-to-message-' + message_id);
            var comment_container = parent.find('#message-replies-container-' + message_id);

            var is_open = reply_panel.data('is_open');
            if(is_open){
                $(reply_panel).slideUp(300);
                $(reply_container).html('');
                $(comment_container).html('');
                $(reply_panel).data('is_open', false);
            } else{
                var tmpl = _.template($("#messageReplyTemplate").html());
                var content_html = tmpl({pk: message_id});
                reply_panel.hide();
                $(reply_container).html(content_html);
                this.render_message_replies(message_id);
                this.rebind_events();
                $(reply_panel).data('is_open', true);
                $(reply_panel).slideDown(300).show();
            }
            return false;
        },
        rebind_events: function() {
            $(this.view_reply_panel).unbind();
            $(this.view_reply_panel).click(this.render_reply_panel);
            $(this.reply_to_message).unbind();
            $(this.reply_to_message).click(this.post_reply_to_message);
            $(this.delete_a_message).unbind();
            $(this.delete_a_message).click(this.delete_message);
            $(this.like_a_message_button).unbind();
            $(this.like_a_message_button).click(this.like_message);
            $(this.start_a_discussion).unbind();
            $(this.start_a_discussion).click(this.post_reply_to_message);
            $(this.autocomplete_enabled_input).autocomplete({ disabled: true });
            var autocomplete_list = this.autocomplete_list;
            $(this.autocomplete_enabled_input).autocomplete({
                source:  function(request, response) {
                    var results = $.ui.autocomplete.filter(autocomplete_list, request.term);

                    response(results.slice(0, 10));
                },
                disabled: false,
                messages: {
                    noResults: '',
                    results: function() {}
                },
                minLength: 1
            });
            $(window).unbind();
            $(window).scroll(this.checkScroll);
            $(this.show_more_messages_button).unbind();
            $(this.show_more_messages_button).click(this.self_refresh);
            if(this.enable_refresh == true){
                if(this.interval_id != undefined){
                    clearTimeout(this.interval_id);
                }
                var that = this;
                if(this.stop_polling == false){
                    this.interval_id = setTimeout(function() {
                        get_message_notifications({classgroup: that.classgroup, start_time: that.start_time()}, that.show_message_notification, undefined);
                    }, 10000);
                } else{
                    this.interval_id = undefined;
                }
            }
        },
        show_message_notification: function(data){
            var message_html = "";
            this.message_count = data.message_count;
            if(this.message_count > 0){
                var tmpl = _.template($(this.show_more_messages_template).html());
                message_html = tmpl({
                    message_count: data.message_count
                });
                document.title = "(" + this.message_count + ") " + this.document_title;
                $(this.show_more_messages_container).html(message_html);
                if(this.message_count >= 10){
                    this.stop_polling = true;
                }
            } else {
                document.title = this.document_title;
            }
            this.rebind_events();
        },
        child_messages: function(message_id){
            message_id = parseInt(message_id);
            var child_messages = new ChildMessages();
            child_messages.fetch({async: false, data: {classgroup: this.classgroup, in_reply_to_id: message_id}});
            return child_messages.models
        },
        render: function () {
            var model_html = "";
            var that = this;
            var top_level_messages = this.top_level_messages();
            if(this.collection.length > 0){
                _.each(top_level_messages, function (item) {
                    model_html = model_html + $(that.renderMessage(item)).html();
                }, this);
            } else {
                model_html = $(this.no_message_template_name).html();
            }
            var tmpl = _.template($(this.template_name).html());
            var content_html = tmpl({messages: model_html, classgroup: this.classgroup, display_tag: this.display_tag});
            $(this.el).html(content_html);
            this.rebind_events();
        },
        renderNewMessage: function(item){
            var reply_to = item.get('reply_to');
            var comment_insert;
            var first_comment = $(this.el).find(".comments").find(".comment:first");
            var first_date = new Date(first_comment.data('created'));
            var item_date = new Date(item.get('created'));
            if(reply_to == null){
                comment_insert = $(this.el).find(".comments")
            } else {
                var comment_container = $(".comment[data-message-id='" + reply_to +"'][data-contains-replies='true']");
                if(comment_container.length > 0){
                    comment_insert = comment_container.children(".message-replies-container")
                }
            }
            if(comment_insert != undefined){
                if(item_date > first_date){
                    comment_insert.prepend(this.renderMessage(item));
                } else {
                    comment_insert.append(this.renderMessage(item));
                }
            }
        },
        renderMessage: function (item) {
            var userView = new this.view_class({
                model: item
            });
            return userView.render().el;
        },
        rebind_collection: function(){
            this.collection.bind('add', this.renderNewMessage, this);
        },
        unbind_collection: function(){
            this.collection.unbind();
        },
        refresh: function(options){
            this.classgroup = options.classgroup;
            this.display_tag = options.display_tag;
            this.unbind_collection();
            this.collection.url = this.collection.baseUrl;
            this.collection.fetch({async:false, data: this.fetch_data});
            this.rebind_collection();
            this.setElement(this.el_name);
            $(this.el).empty();
            this.render_messages();
        },
        self_refresh: function(){
          this.refresh(this.options);
          this.rebind_events();
          this.message_count = 0;
          this.stop_polling= false;
        },
        start_time: function(){
            return this.collection.max_time;
        },
        checkScroll: function () {
            var triggerPoint = 400;
            if( !this.isLoading && ($(window).scrollTop() + $(window).height() + triggerPoint) > ($("#wrap").height()) && this.enable_infinite_scroll == true ) {
                this.isLoading = true;
                var that = this;
                var status = this.collection.nextPage({
                    success: function(){
                        that.isLoading = false;
                        that.rebind_events();
                    },
                    error: function(){
                        that.isLoading = false;
                    },
                    async: false
                });
                if(status==false){
                    that.isLoading = false;
                }
            }
        }
    });

    var NotificationView = MessageView.extend({
        template_name: "#notificationTemplate"
    });

    var NotificationsView = MessagesView.extend({
        collection_class: Notifications,
        view_class: NotificationView,
        enable_refresh: false,
        no_message_template_name: "#noNotificationsTemplate"
    });

    var AnnouncementsView = MessagesView.extend({
        enable_refresh: false,
        no_message_template_name: "#noAnnouncementsTemplate",
        additional_filter_parameters: {message_type : "A"},
        enable_infinite_scroll: false
    });

    var SettingsView = BaseView.extend({
        el: "#settings-container",
        template_name: "#settingsTemplate",
        student_settings_template: "#studentSettingsTemplate",
        student_settings_form: "#student-settings-form",
        avatar_change_template: "#avatarChangeTemplate",
        avatar_change_form: "#avatar-change-form",
        class_settings_template: "#classSettingsTemplate",
        class_settings_form: "#class-settings-form",
        events: {
        },
        initialize: function(options){
            _.bindAll(this, 'render', 'fetch', 'rebind_events', 'render_class_settings');
            this.is_owner = $("#classinfo").data("is-owner");
            this.class_link = $("#classinfo").data("class-link");
            this.class_settings_link = this.class_link + "class_settings/";
            this.student_class_settings_link = this.class_link + "student_settings/";
            this.avatar_change_link = $("#classinfo").data('avatar-change-link');
            this.classgroup = options.classgroup;
            this.fetch();
        },
        fetch: function(){
            this.student_settings = $.getValues(this.student_class_settings_link, {classgroup: this.classgroup});
            this.avatar_change = $.getValues(this.avatar_change_link);
            this.class_settings=undefined;
            if(this.is_owner == true){
                this.class_settings = $.getValues(this.class_settings_link, {classgroup: this.classgroup});
            }
        },
        render_student_settings: function(){
            var tmpl = _.template($(this.student_settings_template).html());
            var settings_html = tmpl({form_html : this.student_settings});
            return settings_html;
        },
        render_avatar_change: function(){
            var tmpl = _.template($(this.avatar_change_template).html());
            var avatar_html = tmpl({avatar_html : this.avatar_change});
            return avatar_html
        },
        render_class_settings: function(){
            var tmpl = _.template($(this.class_settings_template).html());
            var settings_html = tmpl({form_html : this.class_settings, class_link: window.location.host + this.class_link});
            return settings_html;
        },
        render: function () {
            $(this.el).html(this.render_student_settings() + this.render_avatar_change());
            if(this.is_owner == true){
                $(this.el).append(this.render_class_settings());
            }
            $("label[for='id_avatar']").hide();
            this.rebind_events();
            return this;
        },
        refresh: function(){
            this.fetch();
            this.render();
        },
        rebind_events: function(){
            $(this.student_settings_form).unbind();
            $(this.avatar_change_form).unbind();
            $(this.class_settings_form).unbind();
            var that = this;
            $(this.student_settings_form).ajaxForm(function() {
                that.refresh();
                $(that.student_settings_form).find('.help-block-message').html("Successfully saved your preferences.");
            });
            $(this.avatar_change_form).ajaxForm(function() {
                that.refresh();
                $(that.avatar_change_form).find('.help-block-message').html("Updated your avatar.");
            });
            $(this.class_settings_form).ajaxForm(function() {
                that.refresh();
                $(that.class_settings_form).find('.help-block-message').html("Saved your class settings.");
            });
        },
        remove_el: function(){
            $(this.el).remove();
        }
    });

    var ResourceView = BaseView.extend({
        tagName: "div",
        className: "resources",
        template_name: "#resourceTemplate",
        events: {
        },
        initialize: function(){
            _.bindAll(this, 'render');
            this.model.bind('change', this.render);
            this.model.bind('remove', this.unrender);
            this.class_owner = $("#classinfo").data('class-owner');
            this.is_owner = $("#classinfo").data('is-owner');
        },
        get_model_json: function(){
            var model_json = this.model.toJSON();
            model_json.created_formatted = model_json.created.replace("Z","");
            model_json.created_formatted = moment.utc(model_json.created_formatted).local().fromNow();
            model_json.written_by_owner = (this.class_owner == model_json.user);
            model_json.is_owner = this.is_owner;
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

    var ResourcesView = BaseView.extend({
        el: "#resources-container",
        template_name: "#resourcesTemplate",
        create_a_resource_button: "#create-a-resource-button",
        resource_creation_link: "/api/resources/author",
        create_a_resource_modal: "#resourceCreationModal",
        resource_modal_id: "#create-a-resource-modal",
        resource_form_container_id: "#resource-creation-form-container",
        resource_type_button: ".resource-type-button",
        resource_form_id: "#resource-creation-form",
        resource_container: "#resources-container",
        resources_template: "#resourcesTemplate",
        resource_template: "#resourceTemplate",
        resource_modal_template: "#resourceModal",
        view_a_resource_modal: '.view-a-resource-modal',
        show_resource_modal_link: '.show-resource-modal-link',
        no_resources_template: '#noResourcesTemplate',
        collection_class: Resources,
        view_class: ResourceView,
        events: {
            'click #create-a-resource-button': this.create_resource,
            'click .show-resource-modal-link': this.show_resource_modal
        },
        initialize: function(options){
            _.bindAll(this, 'render', 'create_resource', 'rebind_events', 'show_resource_form', 'show_resource_modal');
            this.is_owner = $("#classinfo").data("is-owner");
            this.class_link = $("#classinfo").data("class-link");
            this.classgroup = options.classgroup;
            this.collection = new this.collection_class();
            this.fetch_data = {classgroup: this.classgroup};
            this.collection.fetch({async: false, data: this.fetch_data});
        },
        refresh: function(){
            this.render();
        },
        rebind_events: function(){
            $(this.create_a_resource_button).unbind();
            $(this.create_a_resource_button).click(this.create_resource);
            $(this.resource_form_id).unbind();
            var that = this;
            $(this.resource_form_id).ajaxForm({
                success: function() {
                    $(that.resource_modal_id).modal('hide');
                },
                data: {
                    classgroup: this.classgroup,
                    resource_type: $(this.resource_form_container_id).data('resource-type')
                },
                error: function(){
                    $(that.resource_modal_id).find('.help-block-resource').html('Could not create your resource.')
                }
            });
            $(this.show_resource_modal_link).unbind();
            $(this.show_resource_modal_link).click(this.show_resource_modal);
        },
        show_resource_form: function(event){
            event.preventDefault();
            var resource_type = $(event.target).data('resource-type');
            var author_html = $.getValues(this.resource_creation_link, {classgroup: this.classgroup, resource_type: resource_type}).form_html;
            $(this.resource_form_container_id).html(author_html);
            $(this.resource_form_container_id).data('resource-type', resource_type);
            this.rebind_events();
            return false;
        },
        show_resource_modal: function(event){
            event.preventDefault();
            var resource_id = $(event.target).data('resource-id');
            var tmpl = _.template($(this.resource_modal_template).html());
            var resource = new Resource({pk: resource_id});
            resource.fetch({async: false});
            var modal_html = tmpl({
                html: resource.get('html')
            });
            $(this.view_a_resource_modal).modal('hide');
            $(this.view_a_resource_modal).remove();
            $(this.el).append(modal_html);
            console.log(modal_html);
            $(this.view_a_resource_modal).modal('show');
            return false;
        },
        create_resource: function(){
            var tmpl = $(this.create_a_resource_modal).html();
            this.$el.append(tmpl);
            $(this.resource_modal_id).modal('show');
            $(this.resource_type_button).unbind();
            $(this.resource_type_button).click(this.show_resource_form);
        },
        render: function () {
            var model_html = "";
            var that = this;
            if(this.collection.length > 0){
                _.each(this.collection.models, function (item) {
                    model_html = model_html + $(that.renderResource(item)).html();
                }, this);
            } else {
                model_html = $(this.no_resources_template).html();
            }
            var tmpl = _.template($(this.template_name).html());
            var content_html = tmpl({resources: model_html, classgroup: this.classgroup});
            $(this.el).html(content_html);
            this.rebind_events();
        },
        renderResource: function (item) {
            var resourceView = new this.view_class({
                model: item
            });
            return resourceView.render().el;
        }
    });

    window.MessagesView = MessagesView;
    window.MessageView = MessageView;
    window.ClassView = ClassView;
    window.ClassesView = ClassesView;
    window.Class = Class;
    window.EmailSubscription = EmailSubscription;
    window.ClassDetailView = ClassDetailView;
    window.post_code = post_code;
});
