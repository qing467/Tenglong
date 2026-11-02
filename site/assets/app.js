(function () {
  'use strict';

  /* 时钟：与扩展一致，HH:MM + 小号秒 */
  var clocks = document.querySelectorAll('[data-clock]');
  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }
  function tick() {
    var d = new Date();
    var hh = pad(d.getHours());
    var mm = pad(d.getMinutes());
    var ss = pad(d.getSeconds());
    for (var i = 0; i < clocks.length; i++) {
      clocks[i].innerHTML = hh + ':' + mm + '<span class="sec">:' + ss + '</span>';
    }
  }
  tick();
  setInterval(tick, 1000);

  /* 预览标签切换 */
  var tabs = document.querySelectorAll('.demo-tab');
  var stages = document.querySelectorAll('.stage');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      var key = tab.getAttribute('data-tab');
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      stages.forEach(function (s) {
        s.classList.toggle('is-on', s.getAttribute('data-stage') === key);
      });
    });
  });

  /* 导航滚动态 */
  var nav = document.getElementById('nav');
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* 入场动画 */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    items.forEach(function (el) {
      io.observe(el);
    });
  } else {
    items.forEach(function (el) {
      el.classList.add('in');
    });
  }

  /* 复制命令 */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var tip = btn.querySelector('.copy-tip');
      var done = function () {
        if (!tip) return;
        var old = tip.textContent;
        tip.textContent = '已复制';
        setTimeout(function () {
          tip.textContent = old;
        }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        done();
      }
    });
  });
})();
