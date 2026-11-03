# web-routine-extras Specification

## Purpose
A routine step can carry the pictures, the notes, and the reference links that describe the exercise, so a shared routine explains itself.

## Requirements

### Requirement: Description per step

A step SHALL carry an optional description of at most 500 characters. The description SHALL accept any text, including line breaks and non-ASCII characters, because it never reaches the watch. The system SHALL store it with the routine, SHALL show it on the public share page with its line breaks preserved, and SHALL reject a routine whose description is longer than the limit or is not text. An empty description SHALL be omitted from the stored routine.

#### Scenario: Add a description

- **WHEN** the owner writes notes for a step and saves
- **THEN** the notes are stored with the routine and shown on the public share page under the step

#### Scenario: Multi-line description

- **WHEN** a description contains line breaks
- **THEN** the public page renders the line breaks instead of collapsing them into one line

#### Scenario: Description over the limit

- **WHEN** a routine is saved with a description longer than 500 characters, or with a description that is not text
- **THEN** the save is rejected with a field error and nothing is stored

#### Scenario: Description stays out of the watch document

- **WHEN** a routine with descriptions is imported on the watch through an import code
- **THEN** the watch receives the version-1 document without the descriptions and imports the routine as before

### Requirement: Images per step

A step SHALL carry at most 3 images. Images SHALL be embedded in the routine definition as `data:` URLs, SHALL be shrunk and re-encoded in the browser before they are sent (longest edge at most 1024 px, at most 150 KB per image), and SHALL be accepted by the server only as embedded PNG, JPEG, WebP, or GIF data URLs of at most 200 KB each. The system SHALL reject a routine that exceeds the image limits and SHALL show the images of a step on the public share page.

#### Scenario: Add images to a step

- **WHEN** the owner uploads one or more pictures for a step
- **THEN** each picture is shrunk in the browser, shown as a thumbnail in the editor, and stored with the routine

#### Scenario: Image limit per step

- **WHEN** a step already holds 3 images and another picture is uploaded
- **THEN** the extra picture is not added and the editor explains the limit

#### Scenario: Invalid image rejected

- **WHEN** a routine is saved with a step holding more than 3 images, or an image that is not an accepted embedded image, or an image above the size limit
- **THEN** the save is rejected with a field error and nothing is stored

#### Scenario: Images on the public page

- **WHEN** a visitor opens a share link of a routine whose steps carry images
- **THEN** every image of every step is displayed on the page

### Requirement: Links per step

A step SHALL carry at most 3 links. A link SHALL be an absolute `http` or `https` URL of at most 500 characters, and the system SHALL reject a routine with a link of another form. Links SHALL be shown on the public share page as clickable links.

#### Scenario: Add links to a step

- **WHEN** the owner adds an `https` link to a step and saves
- **THEN** the link is stored with the routine and appears on the public share page

#### Scenario: Invalid link rejected

- **WHEN** a routine is saved with a link that is not an `http(s)` URL, or with more than 3 links on a step
- **THEN** the save is rejected with a field error and nothing is stored

### Requirement: Extras stay out of the watch document

The document returned by the public resolve endpoint SHALL contain only the fields the watch understands (name, seconds, repeat, rest). Descriptions, images, and links SHALL be stored with the routine and shown on share pages, but SHALL NOT be part of the version-1 document handed to the watch, so existing watch builds keep importing routines unchanged.

#### Scenario: Watch import is unaffected

- **WHEN** a routine with images and links is imported on the watch through an import code
- **THEN** the watch receives the version-1 document without the extras and imports the routine as before
