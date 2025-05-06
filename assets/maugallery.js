(function($) {
  // Déclaration du plugin
  $.fn.mauGallery = function(options) {
    // Fusion des options utilisateur avec les valeurs par défaut
    options = $.extend({}, $.fn.mauGallery.defaults, options);
    return this.each(function() {
      const $gallery       = $(this);
      const tagsCollection = [];

      // 1. Création du wrapper de ligne unique à cette galerie
      $.fn.mauGallery.methods.createRowWrapper($gallery);

      // 2. Création de la lightbox si activée
      if (options.lightBox) {
        $.fn.mauGallery.methods.createLightBox(
          $gallery,
          options.lightboxId,
          options.navigation
        );
      }

      // 3. Attachement des listeners, scoped à cette instance
      $.fn.mauGallery.listeners.call($gallery, options);

      // 4. Traitement de chaque item
      $gallery.children(".gallery-item").each(function() {
        const $item = $(this);
        $.fn.mauGallery.methods.responsiveImageItem($item);
        $.fn.mauGallery.methods.moveItemInRowWrapper($item);
        $.fn.mauGallery.methods.wrapItemInColumn($item, options.columns);

        const theTag = $item.data("gallery-tag");
        if (
          options.showTags &&
          theTag !== undefined &&
          tagsCollection.indexOf(theTag) === -1
        ) {
          tagsCollection.push(theTag);
        }
      });

      // 5. Affichage de la barre de tags si demandé
      if (options.showTags) {
        $.fn.mauGallery.methods.showItemTags(
          $gallery,
          options.tagsPosition,
          tagsCollection
        );
      }

      // 6. Affichage progressif de la galerie
      $gallery.fadeIn(500);
    });
  };

  // Options par défaut
  $.fn.mauGallery.defaults = {
    columns: 3,
    lightBox: true,
    lightboxId: null,
    showTags: true,
    tagsPosition: "bottom",
    navigation: true
  };

  
  $.fn.mauGallery.listeners = function(options) {
    const $gallery = this;

    $gallery.off(".mauGallery");

    // Clic sur une image : ouverture de la lightbox
    $gallery.on("click.mauGallery", ".gallery-item", function() {
      if (options.lightBox && this.tagName === "IMG") {
        $.fn.mauGallery.methods.openLightBox(
          $(this),
          options.lightboxId
        );
      }
    });

    // Clic sur un tag : filtrage des images
    $gallery.on(
      "click.mauGallery",
      ".nav-link",
      $.fn.mauGallery.methods.filterByTag
    );

    // Flèche précédente
    $gallery.on("click.mauGallery", ".mg-prev", function() {
      $.fn.mauGallery.methods.changeImage.call(
        $gallery,
        options.lightboxId,
        -1
      );
    });

    // Flèche suivante
    $gallery.on("click.mauGallery", ".mg-next", function() {
      $.fn.mauGallery.methods.changeImage.call(
        $gallery,
        options.lightboxId,
        +1
      );
    });
  };

  // -------------- MÉTHODES --------------
  $.fn.mauGallery.methods = {
    // Crée une seule div.row pour cette galerie
    createRowWrapper: function($gallery) {
      if (!$gallery.children(".gallery-items-row").length) {
        $gallery.append(
          '<div class="gallery-items-row row"></div>'
        );
      }
    },

    // Place chaque item dans la bonne colonne de sa galerie
    moveItemInRowWrapper: function($item) {
      $item.appendTo(
        $item
          .closest(".gallery")
          .find(".gallery-items-row")
      );
    },

    // Ajoute la classe Bootstrap si c'est une image
    responsiveImageItem: function($item) {
      if ($item.prop("tagName") === "IMG") {
        $item.addClass("img-fluid");
      }
    },

    // Wrap de l’item dans une colonne responsive
    wrapItemInColumn: function($item, columns) {
      if (typeof columns === "number") {
        $item.wrap(
          `<div class="item-column mb-4 col-${Math.ceil(
            12 / columns
          )}"></div>`
        );
      } else {
        let classes = "";
        ["xs", "sm", "md", "lg", "xl"].forEach(bp => {
          if (columns[bp]) {
            classes += ` col-${bp === "xs" ? "" : bp + "-"}${Math.ceil(
              12 / columns[bp]
            )}`;
          }
        });
        $item.wrap(
          `<div class="item-column mb-4${classes}"></div>`
        );
      }
    },

    // Ouvre la lightbox et y injecte l'image cliquée
    openLightBox: function($item, lightboxId) {
      const $lb = $(`#${lightboxId}`);
      $lb.find(".lightboxImage").attr("src", $item.attr("src"));
      $lb.modal("toggle");
    },

    // Change d'image (+1 ou -1) avec wrap-around et filtrage par tag
    changeImage: function(lightboxId, direction) {
      const $gallery = this;
      const $lb      = $(`#${lightboxId}`);
      const currSrc  = $lb.find(".lightboxImage").attr("src");

      // Récupère tous les imgs de la galerie, puis filtre
      const srcs = $gallery
        .find("img.gallery-item")
        .filter((i, img) => {
          const tag = $gallery
            .find(".tags-bar .active-tag")
            .data("images-toggle");
          return tag === "all" || $(img).data("gallery-tag") === tag;
        })
        .map((i, img) => $(img).attr("src"))
        .get();

      let idx = srcs.indexOf(currSrc);
      if (idx < 0) return;

      // +1 ou -1 avec boucle
      idx = (idx + direction + srcs.length) % srcs.length;
      $lb.find(".lightboxImage").attr("src", srcs[idx]);
    },

    // Génère le HTML de la barre de tags
    showItemTags: function($gallery, position, tags) {
      let items = `<li class="nav-item"><span class="nav-link active active-tag" data-images-toggle="all">Tous</span></li>`;
      tags.forEach(tag => {
        items += `<li class="nav-item"><span class="nav-link" data-images-toggle="${tag}">${tag}</span></li>`;
      });
      const nav = `<ul class="my-4 tags-bar nav nav-pills">${items}</ul>`;
      position === "top" ? $gallery.prepend(nav) : $gallery.append(nav);
    },

    // Montre/cach e les items selon le tag cliqué
    filterByTag: function() {
      const $link = $(this);
      if ($link.hasClass("active-tag")) return;

      const $gallery = $link.closest(".gallery");
      $gallery.find(".active-tag").removeClass("active active-tag");
      $link.addClass("active active-tag");

      const tag = $link.data("images-toggle");
      $gallery.find(".item-column").each(function() {
        const $col = $(this);
        const $img = $col.find("img.gallery-item");
        if (tag === "all" || $img.data("gallery-tag") === tag) {
          $col.show(300);
        } else {
          $col.hide(300);
        }
      });
    }
  };
})(jQuery);
