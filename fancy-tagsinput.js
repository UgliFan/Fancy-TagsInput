define(['jquery'],function($){
  var defaults={
    templates:{
      recoLabel:'常用',
      openReco:true,
      animate:true,
      maxHeight:'200px',
      tag:'<span class="ykb-tag-item"></span>',
      styles:{
        border:'1px solid #ddd'
      },
      defaultMsg:'邮箱地址用空格、回车或分号分隔'
    },
    format:'{name}&lt;{value}&gt;',
    regular:'email',
    reco:undefined,//Array 或 Promise对象 [{name:'',value:''}]
    maxTags:undefined,
    tagsOverflow:function(){},
    maxReco:undefined,
    afterDelReco:function(kvp){},
    afterDelTag:function(kvp){},
    autoComplete:undefined //必须是Promise对象 [{name:'',value:''}]
  };
  var _utils={
    regularEnum:{
      email:{
        check:function(str){
          if(str&&str.length<100) {
            var regex = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
            if (regex.test(str)) {
              return true;
            } else {
              _utils.activeMsg('请输入正确的邮箱格式,如:名字&lt;name@email.com&gt;', false);
              _utils.dom.find('.ykb-tags-input').val(str.replace(/(\ |\;|\；)/g,''));
              return false;
            }
          } else {
            _utils.dom.find('.ykb-tags-input').val('');
            _utils.activeMsg('邮箱长度必须在1到100之间', false);
          }
        },
        genObj:function(value){
          var regex=/^([a-zA-Z0-9_\.\-])*\<([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+\>$/;
          if (regex.test(value)) {
            var pattern=new RegExp('\\<(.| )+?\\>','igm');
            var matches=value.match(pattern);
            var val=matches.length>0?matches[0].substr(1,matches[0].length-2):'';
            return {name:value.substr(0,value.indexOf('<')),value:val};
          } else {
            return {name:'',value:value};
          }
        }
      }
    },
    activeMsg:function(msg,success){
      msg = msg ? msg:this.opts.templates.defaultMsg;
      success = success===undefined?true:success;
      var $that=this.container.find('.ykb-tag-msg');
      $that.html(msg);
      if(success){
        $that.removeClass('error');
      }else if(!$that.hasClass('error')){
        $that.addClass('error');
      }
    },
    genRegular:function(regular,actionType,str){
      var regulars=this.regularEnum[regular];
      if(regulars){
        var act=regulars[actionType];
        return act(str);
      }else{
        if(console){
          console.error('options:regular is not supported');
        }
      }
    },
    initEvent:function(){
      var $dom=this.container;
      var $this=this;
      $dom.on('click','.ykb-tags-main',function(evt){
        evt.preventDefault();
        if($(evt.target).hasClass('ykb-tags-main')||$(evt.target).hasClass('ykb-tags-container')){
          _utils.dom.find('.ykb-tags-input').focus();
        }
      });
      $dom.on('keyup','.ykb-tags-input',function(evt){
        $this.activeMsg();
        $this.timeStamp=evt.timeStamp;
        var value=$(evt.currentTarget).val().trim();
        $(evt.currentTarget).val(value);
        if(evt.keyCode===13||evt.keyCode===32||evt.keyCode===186){
          if(evt.keyCode===186){
            value=value.replace(/(\;|\；)/g,'');
            $(evt.currentTarget).val(value);
          }
          var $autoList=$this.dom.find('.ykb-tags-auto'),
              current = $autoList.find('.active');
          if(evt.keyCode===13&& $autoList.is(':visible') && current.size()>0){
            var kvp = $this._objToKVP(current);
            if ($this.genRegular($this.opts.regular,'check',kvp.value)) {
              $this.addTag(kvp);
            }
          }else {
            var thatObj = $this.genRegular($this.opts.regular,'genObj',value);
            if ($this.genRegular($this.opts.regular,'check',thatObj.value)) {
              $this.addTag(thatObj);
            }
          }
          $this.renderAutoList(false);
        } else if(evt.keyCode===38||evt.keyCode===40){
          evt.preventDefault();
          $this.autoListUpDown(evt.keyCode);
          return false;
        }else {
          setTimeout(function(){
            if(evt.timeStamp-$this.timeStamp===0){
              //autoComplete
              if($this.opts.autoComplete && typeof $this.opts.autoComplete === 'function'){
                $this.renderAutoList(true);
              }
            }
          },300);
        }
      });
      $dom.on('keydown','.ykb-tags-input',function(evt){
        var value=$(evt.currentTarget).val().trim();
        if(evt.keyCode===8){
          if(value.length<=0)
            $this.delLastTag();
        }else if(evt.keyCode===38||evt.keyCode===40){
          evt.preventDefault();
        }
      });
      $dom.on('click','.ykb-tags-auto li',function(evt){
        evt.preventDefault();
        var $target=$(evt.currentTarget);
        var kvp = $this._objToKVP($target);
        if ($this.genRegular($this.opts.regular,'check',kvp.value)) {
          $this.addTag(kvp);
        }
        $this.renderAutoList(false);
      });
    },
    renderAutoList:function(show){
      var $this=this;
      var $autoList = $this.dom.find('.ykb-tags-auto');
      if(show) {
        var value=$this.dom.find('.ykb-tags-input').val().trim();
        var kvp=$this.genRegular($this.opts.regular,'genObj',value);
        var promise = $this.opts.autoComplete(kvp);
        if (promise && typeof promise.then === 'function') {
          if (value) {
            promise.then(function (data) {
              if (data && $.isArray(data) && data.length > 0) {
                $autoList.show();
                $autoList.animate({opacity:1}, 100, function () {
                  $autoList.html('');
                  $.each(data, function (i, item) {
                    $autoList.append('<li class="ykb-tags-animate" ykb-tag-name="' + item.name + '" ykb-tag-value="' + item.value + '">' + $this.formatDisplay(item) + '</li>');
                  });
                });
              } else {
                $this.renderAutoList(false);
              }
            });
          } else {
            $this.renderAutoList(false);
          }
        } else {
          $this.renderAutoList(false);
          if (console) {
            console.error('autoComplete must be Promise');
          }
        }
      }else{
        $autoList.animate({opacity:0}, 100, function () {
          $autoList.hide();
          $autoList.find('li').removeClass('active');
        });
      }
    },
    autoListUpDown:function(code){
      var $autoList=this.dom.find('.ykb-tags-auto');
      if($autoList.is(':visible')) {
        var current = $autoList.find('.active');
        current.removeClass('active');
        if (code === 38) {//up
          if (current.size() > 0) {
            var prev = current.prev();
            prev.size() > 0 ? prev.addClass('active') : $autoList.find('li:last').addClass('active');
          } else {
            $autoList.find('li:last').addClass('active');
          }
        } else if (code === 40) {//down
          if (current.size() > 0) {
            var next = current.next();
            next.size() > 0 ? next.addClass('active') : $autoList.find('li:first').addClass('active');
          } else {
            $autoList.find('li:first').addClass('active');
          }
        }
      }else{
        this.renderAutoList(true);
      }
    },
    formatDisplay:function(obj){
      var $this=this;
      var display='';
      if(obj.name) {
        display = $this.opts.format.replace(/\{name\}/g, obj.name).replace(/\{value\}/g, obj.value);
      } else {
        display=obj.value;
      }
      return display;
    },
    chkTagExsit:function(obj,classes){
      var $this=this;
      var isExist=false;
      $this.dom.find(classes).each(function(i,item){
        if($(item).attr('ykb-tag-value')===obj.value){
          isExist=true;
          $(item).animate({opacity:0.1},150,function(){
            $this.updateTag(item,obj);
            $(this).animate({opacity:1},150);
          });
          return false;
        }
      });
      return isExist;
    },
    updateTag:function(item,newObj){
      var $this=this;
      if(newObj.name){
        $(item).off('click','.ykb-tag-close');
        $(item).attr('ykb-tag-name', newObj.name).attr('ykb-tag-value', newObj.value).html( $this.formatDisplay(newObj) + '<span class="ykb-tag-close">X</span>');
        $(item).on('click', '.ykb-tag-close', function () {
          $this._animate_tagOut($(item));
        });
      }
    },
    addTag:function(obj) {
      var $this = this;
      if (!$this.chkTagExsit(obj,'.ykb-tags-container .ykb-tag-item')) {
        if($this.opts.maxTags && $this.dom.find('.ykb-tags-container .ykb-tag-item').size()===$this.opts.maxTags) {
          $this.activeMsg('超出限制,只能输入'+$this.opts.maxTags+'个',false);
          $this.opts.tagsOverflow && $this.opts.tagsOverflow.call(this,$this.opts.maxTags);
        }else{
          var tagObj = $(this.opts.templates.tag).attr('ykb-tag-name', obj.name).attr('ykb-tag-value', obj.value).html($this.formatDisplay(obj) + '<span class="ykb-tag-close">X</span>');
          this.dom.find('.ykb-tags-container').append(tagObj);
          tagObj.animate({opacity: 1}, 300);
          tagObj.on('click', '.ykb-tag-close', function () {
            $this._animate_tagOut(tagObj, function (kvp) {
              $this.opts.afterDelTag && $this.opts.afterDelTag.call($this, kvp);
            });
          });
        }
      }
      $this.dom.find('.ykb-tags-input').val('');
      $this.dom.find('.ykb-tags-input').focus();
    },
    delLastTag:function(){
      var tagObj = this.dom.find('.ykb-tags-container .ykb-tag-item:last');
      this._animate_tagOut(tagObj);
    },
    initReco:function(){
      var $this=this;
      var $that=$this.opts.reco;
      if($that && $.isArray($that)){
        $this._eachReco($that);
      }else if($that){
        var promise=$that();
        if (promise && typeof promise.then === 'function') {
          promise.then(function (data) {
            if ($.isArray(data)) {
              $this._eachReco(data);
            } else {
              if (console) {
                console.error('reco is not Array');
              }
            }
          });
        }else{
          if(console) {
            console.error('option reco is not Array or Promise');
          }
        }
      }
    },
    _eachReco:function(array){
      var $this=this;
      $.each(array, function (i, item) {
        $this._drawReco(item);
        return $this.opts.maxReco ? (i < $this.opts.maxReco-1 ? true : false) : true;
      });
    },
    _drawReco:function(obj){
      var $this=this;
      if($this.genRegular($this.opts.regular,'check',obj.value) && !$this.chkTagExsit(obj,'.ykb-tags-recommend-list .ykb-tag-reco-item')) {
        var recoObj = $(this.opts.templates.tag).attr('ykb-tag-name', obj.name).attr('ykb-tag-value', obj.value).html($this.formatDisplay(obj)+ '<span class="ykb-tag-close">X</span>');
        this.dom.find('.ykb-tags-recommend-list').append(recoObj);
        recoObj.on('click', function (evt) {
          if(!$(evt.target).hasClass('ykb-tag-close')){
            var kvp = $this._objToKVP($(evt.currentTarget));
            $this.addTag(kvp);
          }else{
            $this._animate_tagOut(recoObj,function(kvp){
              $this.opts.afterDelReco && $this.opts.afterDelReco.call($this,kvp);
            });
          }
        });
        recoObj.animate({opacity: 1}, 300);
      }
    },
    _animate_tagOut:function(obj,callBack){
      var $this=this;
      obj.animate({opacity:0},300,function(){
        var kvp=$this._objToKVP(obj);
        obj.remove();
        callBack && callBack.call($this,kvp);
      });
    },
    _objToKVP:function(obj){
      return {
        name:$(obj).attr('ykb-tag-name'),
        value:$(obj).attr('ykb-tag-value')
      };
    },
    buildTmpl:function(){
      var tmplOpts=this.opts.templates;
      var recoList='<div class="ykb-tags-recommend-main '+ (tmplOpts.animate?'ykb-tags-animate':'')+'">'
        +'<label class="ykb-tags-recommend-label">'+tmplOpts.recoLabel+':</label>'
        +'<span class="ykb-tags-recommend-list"></span>'
        +'</div>';
      var html='<style>'
        +'.ykb-tags-main{width:100%;min-height:75px;border:'+tmplOpts.styles.border+';padding:4px;cursor:text;position:relative;}'
        +'.ykb-tags-input{border:none;background:none;box-shadow:none;outline:none;line-height:22px;padding:3px;width:96%;}'
        +'.ykb-tags-recommend-main{width:100%;min-height:30px;padding:4px;}'
        +'.ykb-tags-recommend-label{line-height:20px;margin:0 4px;}'
        +'.ykb-tags-recommend-list{display:block;}'
        +'.ykb-tags-recommend-list .ykb-tag-item{cursor:pointer;}'
        +'.ykb-tag-item{display:inline-block;padding:6px 22px 6px 12px;border:1px solid #ddd;line-height:1;font-size:14px;position:relative;margin:2px;opacity:0;cursor:default;max-width: 200px;text-overflow:ellipsis;overflow:hidden;white-space:nowrap;}'
        +'.ykb-tags-container .ykb-tag-item{background: #2da0d4;color: #fff;border:1px solid #2da0d4;box-shadow:0 0 2px #666;}'
        +'.ykb-tag-reco-item{display:inline-block;padding:6px 12px 6px 12px;border:1px solid #ddd;line-height:1;font-size:14px;position:relative;margin:2px;opacity:0;cursor:pointer;}'
        +'.ykb-tag-reco-item:hover{}'
        +'.ykb-tag-close{position:absolute;right:0;top:0;color:#999;font-size:12px;width:20px;height:26px;line-height:28px;text-align:center;cursor:pointer;color: #fff;text-shadow:0 0 2px #666;transition:all 0.3s ease 0s;}'
        +'.ykb-tag-close:hover{color:#DA2E2E;}'
        +'.ykb-tags-animate{-webkit-transition: all 0.3s;-moz-transition: all 0.3s;-ms-transition: all 0.3s;-o-transition: all 0.3s;transition: all 0.3s;}'
        +'.ykb-tag-msg{font-size: 12px;margin: 4px 8px;color: #666;}'
        +'.ykb-tag-msg.error{color: #DA2E2E;}'
        +'.ykb-tags-auto{position:absolute;left:0;width:100%;max-height:'+tmplOpts.maxHeight+';display:none;opacity:0;list-style:none;margin:0;padding:6px; background:#fff;border:1px solid #ddd;box-shadow:0 0 8px #999;z-index:1;}'
        +'.ykb-tags-auto li{padding: 4px;line-height: 1;font-size: 14px;border:1px solid transparent;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
        +'.ykb-tags-auto li:hover{border:1px solid #2da0d4;background:#2da0d4;color:#fff;box-shadow:0 0 2px #666;cursor:pointer;}'
        +'.ykb-tags-auto li.active{border:1px solid #2da0d4;background:#2da0d4;color:#fff;box-shadow:0 0 2px #666;cursor:pointer;}'
        +'</style>'
        +'<!-- 主体 -->'
        +'<div class="ykb-tags-main '+ (tmplOpts.animate?'ykb-tags-animate':'')+'">'
        +'<span class="ykb-tags-container" style="display:inline-block;"></span>'
        +'<input type="text" class="ykb-tags-input" placeholder="输入"/>'
        +'<ul class="ykb-tags-auto"></ul>'
        +'</div>'
        +'<p class="ykb-tag-msg">'+tmplOpts.defaultMsg+'</p>';
      if(tmplOpts.openReco) html=html+recoList;
      return html;
    }
  };

  return {
    init:function(container,options){
      options=options===undefined?{}:options;
      _utils.container=$(container);
      _utils.opts=$.extend(true,{},defaults,options);
      _utils.dom=$(_utils.buildTmpl());
      _utils.initEvent();
      _utils.container.html(_utils.dom);
      _utils.initReco();
      _utils.container.find('.ykb-tags-input').blur(function(){
        setTimeout(function(){
          _utils.renderAutoList(false);
        },100);
      });
    },
    getSelectObj:function(){
      return $.map(_utils.dom.find('.ykb-tag-item'),function(o){
        return _utils._objToKVP($(o));
      });
    }
  };
});