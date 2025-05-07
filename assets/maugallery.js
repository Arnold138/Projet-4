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
    createLightBox: function($gallery, lightboxId, navigation) {
      // Identifiant de la modale
      const id = lightboxId || "galleryLightbox";
    
      const prev = navigation
        ? '<div class="mg-prev" style="cursor:pointer;position:absolute;top:50%;left:-15px;background:white;"><</div>'
        : '<span style="display:none;"></span>';
      const next = navigation
        ? '<div class="mg-next" style="cursor:pointer;position:absolute;top:50%;right:-15px;background:white;">></div>'
        : '<span style="display:none;"></span>';
    
      // Injection de la structure de la lightbox
      const $modal = $(`
        <div class="modal fade" id="${id}" tabindex="-1" role="dialog" aria-hidden="true">
          <div class="modal-dialog" role="document">
            <div class="modal-content">
              <div class="modal-body" style="position: relative;">
                ${prev}
                <img class="lightboxImage img-fluid" alt="Image affichée dans la modale" />
                ${next}
              </div>
            </div>
          </div>
        </div>
      `);
      $gallery.append($modal);
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
      const $img     = $lb.find(".lightboxImage");
      const currSrc  = $img.attr("src");
    
      // 1) collecte et filtre des src
      const srcs = $gallery
        .find("img.gallery-item")
        .filter((i, img) => {
          const tag = $gallery.find(".tags-bar .active-tag").data("images-toggle");
          return tag === "all" || $(img).data("gallery-tag") === tag;
        })
        .map((i, img) => $(img).attr("src"))
        .get();
    
      // 2) calcul de l'index suivant
      let idx = srcs.indexOf(currSrc);
      if (idx < 0) return;
      idx = (idx + direction + srcs.length) % srcs.length;
      const nextSrc = srcs[idx];
    
      // 3) on translate hors-champ
      const offset = direction > 0 ? "-100%" : "100%";
      $img.css("transform", `translateX(${offset})`);
    
      // 4) après la transition CSS (300ms), on swap et revient
      setTimeout(() => {
        // on replace l'image juste de l'autre côté
        const reset = direction > 0 ? "100%" : "-100%";
        $img
          .attr("src", nextSrc)
          .css("transform", `translateX(${reset})`);
    
        // et on glisse vers le centre
        setTimeout(() => {
          $img.css("transform", "translateX(0)");
        }, 20);
      }, 300);
    }
    ,

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
