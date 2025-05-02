// postcss.config.js
import purgecss from '@fullhuman/postcss-purgecss'

module.exports = {
  plugins: [
    purgecss({
      content: [
        './**/*.html',
        './assets/**/*.js'
      ],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    })
  ]
}
