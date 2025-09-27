export class Panel {
    constructor(el) {
        this.$ = el
        this.$title = this.$.querySelector('.panel-title')
        this.$content = this.$.querySelector('.panel-content')
        this.isExpand = true
        this.$title.addEventListener('click', this.switch.bind(this))
    }

    expand() {
        this.isExpand = true
        this.$content.style.display = 'block'
    }

    collapse() {
        this.isExpand = false
        this.$content.style.display = 'none'
    }

    switch() {        
        if (this.isExpand) {
            this.collapse()
        } else {
            this.expand()
        }
    }
}