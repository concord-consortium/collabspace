# CollabSpace

Viewable at (https://collabspace.concord.org/)[https://collabspace.concord.org/].

## Firebase Model

/users
  /<userid>
    /templates
      <id> => Document

/portals
  /<domain>
    /classes
      /<classHash>
        /activities
          /<activityId> => Activity
            groups => Group{}
    /documents => Document{}
    /artifacts

Activity
  templateId: string (userId:documentId)
  name: string <- use template document name?
  groups: Group{}

Group
  documentId: string
  portalUsers: PortalUser{}
  publications: Publication[]

Publication
  documentId: string
  portalUser: PortalUser
  createdAt: number
  artifactIds: ArtifactId[]

Artifact
  title: string
  mimeType: string
  url: string

