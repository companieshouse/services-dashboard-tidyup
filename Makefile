artifact_name := services-dashboard-tidyup
version       := "unversioned"

.PHONY: all
all: build

.PHONY: clean
clean:
	rm -f ./$(artifact_name)-*.zip
	rm -rf ./build-*
	rm -rf ./dist
	rm -f ./build.log

.PHONY: build
build:
	npm ci
	npm run build


.PHONY: lint
lint:
	#npm run lint

.PHONY: sonar
sonar: test-unit
	#npm run sonarqube

.PHONY: test-unit
test-unit: clean
	npm run coverage

.PHONY: test
test: test-unit

.PHONY: security-check
security-check:
	npm audit --audit-level=high

.PHONY: package
package: build
ifndef version
	$(error No version given. Aborting)
endif
	$(info Packaging version: $(version))
	$(eval tmpdir := $(shell mktemp -d build-XXXXXXXXXX))
	cp -r ./dist/* $(tmpdir)
	cp ./package.json $(tmpdir)
	cp ./package-lock.json $(tmpdir)
	cd $(tmpdir) && npm ci --omit=dev --ignore-scripts
	cd $(tmpdir) && zip -r ../$(artifact_name)-$(version).zip .
	rm -rf $(tmpdir)

.PHONY: dist
dist: lint test-unit clean package

