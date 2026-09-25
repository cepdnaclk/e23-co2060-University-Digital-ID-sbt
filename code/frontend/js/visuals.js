/* Presentation only: no API requests, wallet calls or session writes. */

(() => {

  'use strict';


  const reduced =
    window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;


  // ========================================================
  // SKIP LINK
  // ========================================================

  const main =
    document.querySelector('main');


  if (main) {

    if (!main.id) {
      main.id = 'main-content';
    }


    const skip =
      document.createElement('a');


    skip.href =
      '#' + main.id;


    skip.className =
      'skip-link';


    skip.textContent =
      'Skip to content';


    document.body.prepend(
      skip
    );
  }


  // ========================================================
  // NAVIGATION MENU
  // ========================================================

  const nav =
    document.querySelector(
      '.navbar'
    );


  const links =
    nav?.querySelector(
      '.nav-links'
    );


  if (
    links
    &&
    links.querySelectorAll('a').length > 2
  ) {

    nav.classList.add(
      'has-menu'
    );


    if (!links.id) {

      links.id =
        'presentation-navigation';
    }


    const toggle =
      document.createElement(
        'button'
      );


    toggle.type =
      'button';


    toggle.className =
      'nav-menu-toggle';


    toggle.textContent =
      'Menu ☰';


    toggle.setAttribute(
      'aria-controls',
      links.id
    );


    toggle.setAttribute(
      'aria-expanded',
      'false'
    );


    const close = () => {

      links.classList.remove(
        'is-open'
      );


      toggle.setAttribute(
        'aria-expanded',
        'false'
      );
    };


    toggle.addEventListener(
      'click',
      () => {

        const open =
          links.classList.toggle(
            'is-open'
          );


        toggle.setAttribute(
          'aria-expanded',
          String(open)
        );
      }
    );


    nav.insertBefore(
      toggle,
      links
    );


    nav.addEventListener(
      'keydown',
      event => {

        if (
          event.key === 'Escape'
        ) {

          close();

          toggle.focus();
        }
      }
    );


    links.addEventListener(
      'click',
      event => {

        if (
          event.target.closest('a')
        ) {

          close();
        }
      }
    );
  }


  // ========================================================
  // ACTIVE NAVIGATION LINK
  // ========================================================

  document
    .querySelectorAll(
      '.sidebar a, .nav-links a'
    )
    .forEach(link => {

      const url =
        new URL(
          link.href,
          location.href
        );


      if (
        url.pathname === location.pathname
        &&
        !url.hash
      ) {

        link.classList.add(
          'active'
        );


        link.setAttribute(
          'aria-current',
          'page'
        );
      }
    });


  // ========================================================
  // INFORMATION PANEL PRESENTATION
  // ========================================================

  document
    .querySelectorAll(
      '.info-panel'
    )
    .forEach(panel => {

      const graphic =
        document.createElement(
          'div'
        );


      graphic.className =
        'presentation-graphic';


      graphic.setAttribute(
        'aria-hidden',
        'true'
      );


      graphic.innerHTML =
        '<div class="security-emblem">◇</div>';


      panel.prepend(
        graphic
      );


      // ----------------------------------------------------
      // Login-page authentication flow
      // ----------------------------------------------------

      if (
        /login\.html$/.test(
          location.pathname
        )
      ) {

        const flow =
          document.createElement(
            'div'
          );


        flow.className =
          'auth-flow';


        flow.setAttribute(
          'aria-label',
          'Authentication process'
        );


        flow.innerHTML = `
          <span>
            <b>⌘</b>
            METAMASK
          </span>

          <i>→</i>

          <span>
            <b>↗</b>
            SIGN CHALLENGE
          </span>

          <i>→</i>

          <span>
            <b>◇</b>
            VERIFY WALLET
          </span>
        `;


        graphic.after(
          flow
        );
      }
    });


  // ========================================================
  // STATUS RINGS
  // ========================================================
  //
  // IMPORTANT:
  // QR-page qrValidity ring was intentionally removed.
  //
  // The redesigned QR page already displays its own
  // validity badge and secure QR interface.
  // ========================================================

  function attachRing(
    source,
    host
  ) {

    if (
      !source
      ||
      !host
    ) {

      return;
    }


    const ring =
      document.createElement(
        'div'
      );


    ring.className =
      'status-ring';


    ring.setAttribute(
      'aria-hidden',
      'true'
    );


    const label =
      document.createElement(
        'span'
      );


    ring.append(
      label
    );


    host.prepend(
      ring
    );


    function sync() {

      const value =
        source.textContent
          .trim();


      label.textContent =
        value
        &&
        value !== '-'
          ? value
          : 'Awaiting status';


      const normalized =
        value.toLowerCase();


      ring.dataset.state =

        /^(valid|active|verified)$/
          .test(normalized)

          ? 'valid'

          : /invalid|revoked|suspended|expired/
              .test(normalized)

            ? 'invalid'

            : 'unknown';
    }


    sync();


    new MutationObserver(
      sync
    ).observe(
      source,
      {
        childList: true,
        subtree: true,
        characterData: true
      }
    );
  }


  attachRing(
    document.getElementById(
      'identityValidity'
    ),
    document.getElementById(
      'identity-status'
    )
  );


  attachRing(
    document.getElementById(
      'verificationStatus'
    ),
    document.getElementById(
      'verificationResult'
    )
  );


  /*
    REMOVED:

    attachRing(
      document.getElementById('qrValidity'),
      document.getElementById('qrValidity')
        ?.closest('.card')
    );

    The QR page already has:
    - qrValidity
    - qrValidityBadge
    - live QR status

    So another ring would duplicate the UI.
  */


  // ========================================================
  // CONNECTED WALLET BADGE
  // ========================================================

  const wallet =
    document.getElementById(
      'loginWallet'
    )
    ||
    document.getElementById(
      'adminWalletAddress'
    );


  if (
    wallet
    &&
    /login\.html$/.test(
      location.pathname
    )
  ) {

    const badge =
      document.createElement(
        'span'
      );


    badge.className =
      'badge badge-blue';


    badge.hidden =
      true;


    badge.textContent =
      'Wallet selected';


    wallet.after(
      badge
    );


    const sync = () => {

      badge.hidden =
        !/^0x[a-fA-F0-9]{40}$/
          .test(
            wallet.value.trim()
          );
    };


    wallet.addEventListener(
      'input',
      sync
    );


    wallet.addEventListener(
      'change',
      sync
    );


    // Script assignments do not dispatch
    // normal input events, so watch the
    // existing login status as well.

    const status =
      document.getElementById(
        'studentLoginStatus'
      )
      ||
      document.getElementById(
        'loginMessage'
      );


    if (status) {

      new MutationObserver(
        sync
      ).observe(
        status,
        {
          childList: true,
          subtree: true,
          characterData: true
        }
      );
    }


    sync();
  }


  // ========================================================
  // REVEAL ANIMATIONS
  // ========================================================

  if (
    !reduced
    &&
    'IntersectionObserver' in window
  ) {

    const observer =
      new IntersectionObserver(
        entries => {

          entries.forEach(
            entry => {

              if (
                entry.isIntersecting
              ) {

                entry.target
                  .classList
                  .add(
                    'is-visible'
                  );


                observer.unobserve(
                  entry.target
                );
              }
            }
          );

        },
        {
          threshold: 0.06
        }
      );


    document
      .querySelectorAll(
        '.showcase, ' +
        '.journey-step, ' +
        '.architecture-layer, ' +
        '.bento-cell, ' +
        '.portal-preview'
      )
      .forEach(
        (element, index) => {

          element
            .classList
            .add(
              'reveal-ready'
            );


          element.style
            .transitionDelay =
              (index % 4) * 65
              + 'ms';


          observer.observe(
            element
          );
        }
      );
  }

})();
