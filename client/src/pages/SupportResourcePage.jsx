import React, { useMemo, useState } from "react";
import { Box, Paper, Typography, Chip, Stack, Button, Divider, Breadcrumbs, Link, Card, CardContent } from "@mui/material";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { commonStyles } from "../utils/styleConstants";
import { SUPPORT_INTERNAL_LINKS, SUPPORT_TOPICS } from "../data/supportTopics";
import { SUPPORT_RESOURCE_CONTENT } from "../data/supportResourceContent";
import { hasChatFlow } from "../utils/chatFlowHelpers";
import SupportTicketDialog from "../components/SupportTicketDialog";

export default function SupportResourcePage() {
  const location = useLocation();
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");

  const resource = SUPPORT_INTERNAL_LINKS.find((item) => item.href === location.pathname);
  const topic = SUPPORT_TOPICS.find((item) => item.slug === resource?.slug);
  const isExternalLink = (href = "") => href.startsWith("http");
  const isEmailLink = (href = "") => href.startsWith("mailto:");
  const isTicketLink = (linkItem = {}) => linkItem?.action === "ticket" || isEmailLink(linkItem?.href || "");

  const content = useMemo(() => {
    const knownContent = resource?.slug ? SUPPORT_RESOURCE_CONTENT[resource.slug] : null;
    if (knownContent) {
      return knownContent;
    }

    return {
      overview: resource?.description || "This support resource explains key details and next actions for this topic.",
      highlights: [
        "Review the topic summary before taking action.",
        "Use Support Chat for guided troubleshooting when available.",
        "Return to Support to browse related FAQs and articles."
      ],
      nextSteps: [
        "Read the full topic details on this page.",
        "Take the suggested action using the links below.",
        "Contact support if you need account-specific help."
      ]
    };
  }, [resource]);

  const displayTitle = resource?.title || "Support Resource";
  const displayDescription = resource?.description || "Browse this support topic for guidance and next steps.";
  const displayGroup = resource?.groupTitle || "Support";
  const hasTopicChatFlow = hasChatFlow(resource?.slug || "");
  const solutionLinks = useMemo(() => {
    const raw = Array.isArray(content.solutionLinks) ? content.solutionLinks : [];
    return raw.filter((linkItem) => {
      const href = linkItem?.href || "";
      if (!href || !href.startsWith("/")) {
        return true;
      }

      const pathOnly = href.split("?")[0].split("#")[0];
      return pathOnly !== location.pathname;
    });
  }, [content.solutionLinks, location.pathname]);

  const relatedTopics = useMemo(() => {
    if (!resource?.slug || !resource?.groupTitle) {
      return [];
    }

    return SUPPORT_TOPICS
      .filter((item) => item.slug !== resource.slug)
      .filter((item) => SUPPORT_INTERNAL_LINKS.some((link) => link.slug === item.slug && link.groupTitle === resource.groupTitle))
      .slice(0, 4);
  }, [resource]);

  const openTicketDialog = (subjectOverride) => {
    const fallbackSubject = `Support: ${displayTitle}`;
    setTicketSubject(subjectOverride || fallbackSubject);
    setTicketDialogOpen(true);
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        {displayTitle}
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} underline="hover" color="inherit" to="/support">
            Support
          </Link>
          <Typography color="text.primary" variant="body2">
            {displayGroup}
          </Typography>
          <Typography color="text.primary" variant="body2">
            {displayTitle}
          </Typography>
        </Breadcrumbs>

        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <Chip label={displayGroup} color="primary" size="small" />
          <Chip label="Guide" variant="outlined" size="small" />
        </Stack>

        <Typography variant="body1" sx={{ mb: 1 }}>
          {displayDescription}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {content.overview}
        </Typography>

        {resource?.slug === "terms" && content.documentMeta && (
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                {content.documentMeta.title || "Terms & Conditions"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Effective date: {content.documentMeta.effectiveDate || "N/A"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last updated: {content.documentMeta.lastUpdated || "N/A"}
              </Typography>
            </CardContent>
          </Card>
        )}

        <Divider sx={{ mb: 2 }} />

        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Key points
            </Typography>
            <Box component="ul" sx={{ pl: 2.5, mb: 0, mt: 0 }}>
              {content.highlights.map((point) => (
                <Typography key={point} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {point}
                </Typography>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
              Recommended next steps
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, mb: 0, mt: 0 }}>
              {content.nextSteps.map((step, index) => (
                <Typography key={`${resource?.slug || "resource"}-${index}`} component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {step}
                </Typography>
              ))}
            </Box>
          </CardContent>
        </Card>

        {Array.isArray(content.documentSections) && content.documentSections.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                Terms & Conditions
              </Typography>
              <Stack spacing={2}>
                {content.documentSections.map((section, index) => (
                  <Box key={`${resource?.slug || "resource"}-section-${index}`}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {section.heading}
                    </Typography>
                    <Stack spacing={0.75}>
                      {Array.isArray(section.paragraphs) && section.paragraphs.map((paragraph, paragraphIndex) => (
                        <Typography key={`${resource?.slug || "resource"}-section-${index}-paragraph-${paragraphIndex}`} variant="body2" color="text.secondary">
                          {paragraph}
                        </Typography>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {relatedTopics.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Related resources
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {relatedTopics.map((item) => (
                  <Button
                    key={`related-${item.slug}`}
                    component={RouterLink}
                    to={`/support#${encodeURIComponent(item.slug)}`}
                    variant="outlined"
                    size="small"
                  >
                    {item.title}
                  </Button>
                ))}
              </Stack>
            </CardContent>
          </Card>
        )}

        {solutionLinks.length > 0 && (
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                Solutions
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {solutionLinks.map((linkItem) => {
                  const href = linkItem?.href || "";
                  const external = isExternalLink(href);
                  const email = isEmailLink(href);
                  const internal = href.startsWith("/");
                  const ticketAction = isTicketLink(linkItem);

                  if (!href && !ticketAction) {
                    return null;
                  }

                  return (
                    <Button
                      key={`${resource?.slug || "resource"}-${href || linkItem?.label || "ticket"}`}
                      size="small"
                      variant="contained"
                      component={ticketAction ? "button" : (internal ? RouterLink : "a")}
                      to={!ticketAction && internal ? href : undefined}
                      href={!ticketAction && !internal ? href : undefined}
                      target={!ticketAction && external ? "_blank" : undefined}
                      rel={!ticketAction && external ? "noopener noreferrer" : undefined}
                      onClick={ticketAction ? () => openTicketDialog(linkItem?.subject || `Support ticket: ${displayTitle}`) : undefined}
                    >
                      {linkItem.label || (email ? "Submit Ticket" : "Open")}
                    </Button>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button component={RouterLink} to="/support" variant="contained" size="small">
            Back to Support
          </Button>
          {resource?.slug && (
            <Button component={RouterLink} to={`/support#${encodeURIComponent(resource.slug)}`} variant="outlined" size="small">
              View in Support Hub
            </Button>
          )}
          {resource?.slug && hasTopicChatFlow && (
            <Button component={RouterLink} to={`/support/chat?source=page&slug=${encodeURIComponent(resource.slug)}&title=${encodeURIComponent(resource.title)}`} variant="outlined" size="small">
              Chat with Support
            </Button>
          )}
          {topic?.resourceLink?.href && topic.resourceLink.href !== location.pathname && (
            <Button
              component={isExternalLink(topic.resourceLink.href) ? "a" : RouterLink}
              href={isExternalLink(topic.resourceLink.href) ? topic.resourceLink.href : undefined}
              to={!isExternalLink(topic.resourceLink.href) ? topic.resourceLink.href : undefined}
              target={isExternalLink(topic.resourceLink.href) ? "_blank" : undefined}
              rel={isExternalLink(topic.resourceLink.href) ? "noopener noreferrer" : undefined}
              variant="text"
              size="small"
            >
              {topic.resourceLink.label || "Open resource"}
            </Button>
          )}
        </Stack>
      </Paper>

      <SupportTicketDialog
        open={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        subject={ticketSubject}
        source="support-resource"
        contextSlug={resource?.slug || ""}
        contextTitle={displayTitle}
      />
    </Box>
  );
}
