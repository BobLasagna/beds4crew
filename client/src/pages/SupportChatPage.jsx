import React, { useEffect, useMemo, useState } from "react";
import { Box, Paper, Typography, Stack, Button, Breadcrumbs, Link } from "@mui/material";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { commonStyles } from "../utils/styleConstants";
import supportChatFlows from "../data/supportChatFlows.json";
import { SUPPORT_TOPICS } from "../data/supportTopics";
import { SUPPORT_RESOURCE_CONTENT } from "../data/supportResourceContent";
import { hasChatFlow } from "../utils/chatFlowHelpers";
import SupportTicketDialog from "../components/SupportTicketDialog";

const getDialogTree = (slug) => {
  return supportChatFlows[slug] || supportChatFlows.default;
};

const getNormalizedTree = (slug) => {
  const tree = getDialogTree(slug);
  const startNodeId = tree?.startNode || "start";
  const nodes = tree?.nodes || {};

  if (!nodes[startNodeId]) {
    return {
      startNodeId: "start",
      nodes: {
        start: {
          message: "Tell me what you need and I’ll route you quickly.",
          options: []
        }
      }
    };
  }

  return {
    startNodeId,
    nodes
  };
};

export default function SupportChatPage() {
  const [params] = useSearchParams();
  const slug = params.get("slug") || "default";
  const title = params.get("title") || "Support";

  const tree = useMemo(() => getNormalizedTree(slug), [slug]);
  const topic = useMemo(() => SUPPORT_TOPICS.find((item) => item.slug === slug), [slug]);
  const [currentNodeId, setCurrentNodeId] = useState(tree.startNodeId);
  const [messages, setMessages] = useState(() => [{ role: "bot", text: tree.nodes[tree.startNodeId].message }]);
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");

  const currentNode = tree.nodes[currentNodeId];
  const hasOptions = Array.isArray(currentNode?.options) && currentNode.options.length > 0;
  const resolvedSolutionLink = currentNode?.solutionLink || (!hasOptions ? topic?.resourceLink : null);
  const isInternalSolutionLink = typeof resolvedSolutionLink?.href === "string" && resolvedSolutionLink.href.startsWith("/");
  const isExternalLink = (href = "") => href.startsWith("http");
  const isEmailLink = (href = "") => href.startsWith("mailto:");
  const isTicketLink = (linkItem = {}) => linkItem?.action === "ticket" || isEmailLink(linkItem?.href || "");
  const topicSolutions = useMemo(() => {
    const links = Array.isArray(SUPPORT_RESOURCE_CONTENT[slug]?.solutionLinks) ? SUPPORT_RESOURCE_CONTENT[slug].solutionLinks : [];
    return links.filter((linkItem) => {
      const href = linkItem?.href || "";
      if (!href || !href.startsWith("/")) {
        return true;
      }
      const pathOnly = href.split("?")[0].split("#")[0];
      return pathOnly !== "/support/chat";
    });
  }, [slug]);
  const resolvedTicketAction = isTicketLink(resolvedSolutionLink);

  useEffect(() => {
    setCurrentNodeId(tree.startNodeId);
    setMessages([{ role: "bot", text: tree.nodes[tree.startNodeId].message }]);
  }, [tree]);

  const chooseOption = (option) => {
    const nextNode = tree.nodes[option.next];
    if (!nextNode) {
      return;
    }

    setMessages((prev) => [
      ...prev,
      { role: "user", text: option.label },
      { role: "bot", text: nextNode.message }
    ]);
    setCurrentNodeId(option.next);
  };

  const hasFlow = hasChatFlow(slug);

  const openTicketDialog = (subjectOverride) => {
    setTicketSubject(subjectOverride || `Support chat request: ${title}`);
    setTicketDialogOpen(true);
  };

  return (
    <Box sx={commonStyles.contentContainer}>
      <Typography variant="h4" sx={commonStyles.pageTitle}>
        {hasFlow ? "Chat with Support" : "Contact Support"}
      </Typography>

      <Paper elevation={1} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3 }}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <Link component={RouterLink} underline="hover" color="inherit" to="/support">
            Support
          </Link>
          {hasFlow && (
            <Link component={RouterLink} underline="hover" color="inherit" to={`/support#${encodeURIComponent(slug)}`}>
              {title}
            </Link>
          )}
          <Typography color="text.primary" variant="body2">
            {hasFlow ? "Chat" : "Contact"}
          </Typography>
        </Breadcrumbs>

        {!hasFlow ? (
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700 }}>
                We're here to help
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                For support topics without a guided chat flow, please reach out directly to our team by email or return to browse our support resources.
              </Typography>
            </Box>

            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, backgroundColor: "action.hover" }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700 }}>
                Submit a support ticket
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                We typically respond within 24 hours.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  onClick={() => openTicketDialog(`Support: ${title}`)}
                >
                  Submit Ticket
                </Button>
                {topicSolutions.map((linkItem) => {
                  const href = linkItem?.href || "";
                  const ticketAction = isTicketLink(linkItem);

                  if (!href && !ticketAction) {
                    return null;
                  }

                  const internal = href.startsWith("/");
                  const external = isExternalLink(href);

                  return (
                    <Button
                      key={`${slug}-${href || linkItem?.label || "ticket"}`}
                      variant="outlined"
                      component={ticketAction ? "button" : (internal ? RouterLink : "a")}
                      to={!ticketAction && internal ? href : undefined}
                      href={!ticketAction && !internal ? href : undefined}
                      target={!ticketAction && external ? "_blank" : undefined}
                      rel={!ticketAction && external ? "noreferrer" : undefined}
                      onClick={ticketAction ? () => openTicketDialog(linkItem?.subject || `Support: ${title}`) : undefined}
                    >
                      {linkItem.label || "Open"}
                    </Button>
                  );
                })}
              </Stack>
            </Paper>

            <Button component={RouterLink} to="/support" variant="outlined">
              Back to Support
            </Button>
          </Stack>
        ) : (
          <>
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              {messages.map((message, index) => (
                <Box
                  key={`${message.role}-${index}`}
                  sx={{
                    alignSelf: message.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: { xs: "100%", sm: "80%" },
                    px: 1.5,
                    py: 1,
                    borderRadius: 2,
                    backgroundColor: message.role === "user" ? "primary.main" : "background.default",
                    color: message.role === "user" ? "primary.contrastText" : "text.primary",
                    border: message.role === "user" ? "none" : "1px solid",
                    borderColor: "divider"
                  }}
                >
                  <Typography variant="body2">{message.text}</Typography>
                </Box>
              ))}
            </Stack>

            {hasOptions && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
                {currentNode.options.map((option) => (
                  <Button key={option.label} size="small" variant="contained" onClick={() => chooseOption(option)}>
                    {option.label}
                  </Button>
                ))}
              </Stack>
            )}

            {!hasOptions && (resolvedSolutionLink?.href || resolvedTicketAction) && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Recommended solution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Continue with the best next step for this issue.
                </Typography>
                <Button
                  size="small"
                  variant="contained"
                  component={resolvedTicketAction ? "button" : (isInternalSolutionLink ? RouterLink : "a")}
                  to={!resolvedTicketAction && isInternalSolutionLink ? resolvedSolutionLink.href : undefined}
                  href={!resolvedTicketAction && !isInternalSolutionLink ? resolvedSolutionLink.href : undefined}
                  target={!resolvedTicketAction && !isInternalSolutionLink ? "_blank" : undefined}
                  rel={!resolvedTicketAction && !isInternalSolutionLink ? "noreferrer" : undefined}
                  onClick={resolvedTicketAction ? () => openTicketDialog(resolvedSolutionLink?.subject || `Support chat request: ${title}`) : undefined}
                >
                  {resolvedSolutionLink.label || "Open solution"}
                </Button>
              </Paper>
            )}
          </>
        )}
      </Paper>

      <SupportTicketDialog
        open={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        subject={ticketSubject}
        source="support-chat"
        contextSlug={slug}
        contextTitle={title}
      />
    </Box>
  );
}
