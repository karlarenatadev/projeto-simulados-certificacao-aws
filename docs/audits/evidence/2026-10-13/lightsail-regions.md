## Select your cookie preferences

We use essential cookies and similar tools that are necessary to provide our site and services. We use performance cookies to collect anonymous statistics, so we can understand how customers use our site and make improvements. Essential cookies cannot be deactivated, but you can choose “Customize” or “Decline” to decline performance cookies.

If you agree, AWS and approved third parties will also use cookies to provide useful site features, remember your preferences, and display relevant content, including relevant advertising. To accept or decline all non-essential cookies, choose “Accept” or “Decline.” To make more detailed choices, choose “Customize.”

AcceptDeclineCustomize

## Customize cookie preferences

We use cookies and similar tools (collectively, "cookies") for the following purposes.

### Essential

Essential cookies are necessary to provide our site and services and cannot be deactivated. They are usually set in response to your actions on the site, such as setting your privacy preferences, signing in, or filling in forms.

Allowed

### Performance

Performance cookies provide anonymous statistics about how customers navigate our site so we can improve site experience and performance. Approved third parties may perform analytics on our behalf, but they cannot use the data for their own purposes.

Allowed

### Functional

Functional cookies help us provide useful site features, remember your preferences, and display relevant content. Approved third parties may set these cookies to provide certain site features. If you do not allow these cookies, then some or all of these services may not function properly.

Allowed

### Advertising

Advertising cookies may be set through our site by us or our advertising partners and help us deliver relevant marketing content. If you do not allow these cookies, you will experience less relevant advertising.

Allowed

Blocking some types of cookies may impact your experience of our sites. You may review and change your choices at any time by selecting Cookie preferences in the footer of this site. We and selected third-parties use cookies or similar technologies as specified in the [AWS Cookie Notice](https://aws.amazon.com/legal/cookies/).

CancelSave preferences

## Your privacy choices

We and our advertising partners (“we”) may use information we collect from or about you to show you ads on other websites and online services. Under certain laws, this activity is referred to as “cross-context behavioral advertising” or “targeted advertising.”

To opt out of our use of cookies or similar technologies to engage in these activities, select “Opt out of cross-context behavioral ads” and “Save preferences” below. If you clear your browser cookies or visit this site from a different device or browser, you will need to make your selection again. For more information about cookies and how we use them, read our [Cookie Notice](https://aws.amazon.com/legal/cookies/).

Allow cross-context behavioral adsOpt out of cross-context behavioral ads

To opt out of the use of other identifiers, such as contact information, for these activities, fill out the form [here](https://pulse.aws/application/ZRPLWLL6?p=0).

For more information about how AWS handles your information, read the [AWS Privacy Notice](https://aws.amazon.com/privacy/).

CancelSave preferences

## Unable to save cookie preferences

We will only store essential cookies at this time, because we were unable to save your cookie preferences.

If you want to change your cookie preferences, try again later using the link in the AWS console footer, or contact support if the problem persists.

Dismiss

# Regions and Availability Zones for Lightsail

[PDF](https://docs.aws.amazon.com/pdfs/lightsail/latest/userguide/lightsail-ug.pdf#understanding-regions-and-availability-zones-in-amazon-lightsail)

[RSS](https://docs.aws.amazon.com/lightsail/latest/userguide/document_history.rss)

[Markdown](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.md "Download Markdown")

Agent SetupUp-to-date AWS docs, tested procedures, and IAM guardrails via a single setup prompt in your AI coding agent.

Focus mode

Regions and Availability Zones for Lightsail - Amazon Lightsail

[Open PDF](https://docs.aws.amazon.com/pdfs/lightsail/latest/userguide/lightsail-ug.pdf#understanding-regions-and-availability-zones-in-amazon-lightsail "Open PDF")

[Regions for Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#regions-for-amazon-lightsail) [SSH keys and Lightsail Regions](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#ssh-keys-and-regions) [Tips for working with Lightsail Regions](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#tips-working-with-regions) [Lightsail Availability Zones](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#availability-zones) [Availability Zones and your Lightsail application](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#why-regions-and-availability-zones)

When creating resources in Amazon Lightsail, create them in an AWS Region that is closer
to your users. You can also leverage multiple Availability Zones for fault tolerance and high
availability with your applications. By provisioning resources closer to your users, your users can
benefit from lower latency and increased performance. For example, if your blog traffic comes
mostly from Switzerland, choose **Frankfurt** or
**Paris**.

If your application would benefit from being created in an opt-in Region (Region that is
disabled by default) that is supported for Lightsail, you can [enable the\\
Region](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-enable.html). If you later decide that you no longer want to operate resources in an opt-in
Region, you can [disable the\\
Region](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-disable.html). For more information about opt-in Regions, see [Considerations before enabling and disabling Regions](https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-regions.html#manage-acct-regions-considerations) and the [opt-in Region](https://docs.aws.amazon.com/glossary/latest/reference/glos-chap.html?icmpid=docs_homepage_addtlrcs#optinregion) entry in the _AWS Glossary_.

###### Note

Global resources such as DNS zones and Lightsail distributions are created only in the
US East (N. Virginia) (us-east-1) Region, but they can reference any supported resource in any
AWS Region.

###### Topics

- [Regions for Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#regions-for-amazon-lightsail)

- [SSH keys and Lightsail Regions](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#ssh-keys-and-regions)

- [Tips for working with Lightsail Regions](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#tips-working-with-regions)

- [Lightsail Availability Zones](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#availability-zones)

- [Availability Zones and your Lightsail application](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-regions-and-availability-zones-in-amazon-lightsail.html#why-regions-and-availability-zones)

- [Enable opt-in Regions for Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-enable.html)

- [Disable opt-in Regions for Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-disable.html)


## Regions for Lightsail

Lightsail is available in the following Regions.

- US East (N. Virginia) (us-east-1)

- US East (Ohio) (us-east-2)

- US West (Oregon) (us-west-2)

- Asia Pacific (Hong Kong) (ap-east-1) \*

- Asia Pacific (Jakarta) (ap-southeast-3) \*

- Asia Pacific (Malaysia) (ap-southeast-5) \*

- Asia Pacific (Mumbai) (ap-south-1)

- Asia Pacific (Seoul) (ap-northeast-2)

- Asia Pacific (Singapore) (ap-southeast-1)

- Asia Pacific (Sydney) (ap-southeast-2)

- Asia Pacific (Tokyo) (ap-northeast-1)

- Canada (Central) (ca-central-1)

- EU (Frankfurt) (eu-central-1)

- EU (Ireland) (eu-west-1)

- EU (London) (eu-west-2)

- EU (Paris) (eu-west-3)

- EU (Stockholm) (eu-north-1)

- EU (Spain) (eu-south-2) \*

- South America (São Paulo) (sa-east-1)


\\* This Region is disabled by default. You must [enable the\\
Region](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-enable.html) before you can use it.

![Supported AWS Regions in Amazon Lightsail](https://docs.aws.amazon.com/images/lightsail/latest/userguide/images/amazon-lightsail-regions_720.png)

## SSH keys and Lightsail Regions

In Lightsail, as soon as you create an instance in an AWS Region, we create a
**Default** SSH key in that Region. This default key can be used to connect
to instances only in that specific Region. For more information, see [SSH key pairs](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-ssh-in-amazon-lightsail.html).

## Tips for working with Lightsail Regions

Each AWS Region is designed to be completely isolated from other AWS Regions. This
achieves the greatest possible fault tolerance and stability.

All communication between Regions occurs across the public internet. Therefore, you should
use the appropriate encryption methods to protect your data. There is a charge for
data transfer between Regions. For more information, see [Amazon EC2 Pricing - Data\\
Transfer](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer).

When you work with a Lightsail instance using the AWS Command Line Interface (AWS CLI), we recommend that
you specify the code for the Region using the `--region` option in your AWS CLI
command. For example, you can specify `us-east-1` to return information about DNS
zones and network resources in the US East (N. Virginia) (us-east-1) Region. For more
information about using the AWS CLI `--region` option, see [General\\
Options](http://docs.aws.amazon.com/cli/latest/topic/config-vars.html#general-options) in the _AWS CLI Reference_.

## Lightsail Availability Zones

Each AWS Region has multiple, isolated Availability Zones, which are indicated by a
letter following the Region name (`us-east-2a`).
Availability Zones are collections of data centers that run on physically distinct,
independent infrastructure. Availability Zones are engineered to be highly reliable. Common
points of failure such as generators and cooling equipment are not shared between Availability
Zones. Availability Zones are also physically separate so that even an extreme disaster such
as a fire, tornado, or flood will affect only the single Availability Zone where it
occurred.

![How Availability Zones work in Amazon Lightsail](https://docs.aws.amazon.com/images/lightsail/latest/userguide/images/amazon-lightsail-availability-zones-example.png)

You can create Lightsail instances in only one Availability Zone at a time. You might
not see all Availability Zones at the time you create your instance. If you don't see the list
of Availability Zones at all, be sure that you have selected a Region in the previous
step.

## Availability Zones and your Lightsail application

By launching your instances in separate Availability Zones, you can protect your
applications from a failure in a single location. Before you proceed with such a
configuration, review the general and application specific guidelines. For more information,
see [Configure Lightsail instances for load balancing](https://docs.aws.amazon.com/lightsail/latest/userguide/configure-lightsail-instances-for-load-balancing.html).

To proceed with scaling an existing instance to make your application available in
multiple Availability Zones, first [create a snapshot of your\\
instance](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-snapshots-in-amazon-lightsail.html). Next, choose another Availability Zone when you [create a new instance\\
from the snapshot you created](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-how-to-create-instance-from-snapshot.html). With the new instance created from the snapshot, you
can [distribute web\\
traffic to the instances with a Lightsail load balancer](https://docs.aws.amazon.com/lightsail/latest/userguide/understanding-lightsail-load-balancers.html).

[Document Conventions](https://docs.aws.amazon.com/general/latest/gr/docconventions.html)

IPv6 compatible blueprints

Enable Regions

Did this page help you? - Yes

Thanks for letting us know we're doing a good job!

If you've got a moment, please tell us what we did right so we can do more of it.

Did this page help you? - No

Thanks for letting us know this page needs work. We're sorry we let you down.

If you've got a moment, please tell us how we can make the documentation better.

### View related pages

Abstracts generated by AI

- 1
- 2
- 3
- 4

Lightsail › userguide
[Enable opt-in Regions for Lightsail![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/similar/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Copt-in-regions-for-lightsail-enable.html)](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-enable.html)
Learn how to enable an opt-in Region for Amazon Lightsail from the Lightsail console and AWS Account Management console.

_August 1, 2025_

Lightsail › userguide
[Resilience in Amazon Lightsail![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/similar/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cdisaster-recovery-resiliency.html)](https://docs.aws.amazon.com/lightsail/latest/userguide/disaster-recovery-resiliency.html)
Learn how AWS global infrastructure and Amazon Lightsail features support data resiliency, including cross-region snapshots, automated backups, and load balancing.

_September 13, 2023_

Lightsail › userguide
[Set up SSH keys for Lightsail![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/similar/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Clightsail-how-to-set-up-ssh.html)](https://docs.aws.amazon.com/lightsail/latest/userguide/lightsail-how-to-set-up-ssh.html)
Learn how to set up SSH keys for Amazon Lightsail Linux instances, including creating new key pairs, uploading existing keys, managing keys across regions, and downloading private keys.

_September 13, 2023_

- ### On this page

- Recommended tasks






















### Learn about

















[Amazon Lightsail service endpoints and quotas![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/journey/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Cgeneral%7Clatest%7Cgr%7Clightsail.html)](https://docs.aws.amazon.com/general/latest/gr/lightsail.html)



[Amazon Lightsail data transfer costs and regional allowances![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/journey/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Camazon-lightsail-faq-data-transfer-allowance.html)](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-faq-data-transfer-allowance.html)



[Amazon Route 53 domain registration options![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/journey/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7CRoute53%7Clatest%7CDeveloperGuide%7Cregistrar-tld-list.html)](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/registrar-tld-list.html)



[upgrade AWS account from Free Tier to Paid Plan![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/journey/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Caccounts%7Clatest%7Creference%7Cupgrade-account.html)](https://docs.aws.amazon.com/accounts/latest/reference/upgrade-account.html)



[Enabling an opt-in Region for Lightsail![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/journey/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Copt-in-regions-for-lightsail-enable.html)](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-enable.html)

























### How to

















[upsize Amazon Lightsail resources using snapshots![](https://prod.us-west-2.tcx-beacon.docs.aws.dev/recommendation-beacon/journey/impressions/null/aPrKqLX6l0m9GcTfRJctW0Le3_bNaT7te3W0Ed0fZUJSZokK2WStdg==/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Cunderstanding-regions-and-availability-zones-in-amazon-lightsail.html/https:%7C%7Cdocs.aws.amazon.com%7Clightsail%7Clatest%7Cuserguide%7Chow-to-create-larger-instance-from-snapshot-using-console.html)](https://docs.aws.amazon.com/lightsail/latest/userguide/how-to-create-larger-instance-from-snapshot-using-console.html)

- Did this page help you?








Yes



No













[Provide feedback](https://docs.aws.amazon.com/feedback/doc-feedback.html?hidden_service_name=Lightsail&topic_url=https%3A%2F%2Fdocs.aws.amazon.com%2Flightsail%2Flatest%2Fuserguide%2Funderstanding-regions-and-availability-zones-in-amazon-lightsail.html)


#### Next topic:

[Enable Regions](https://docs.aws.amazon.com/lightsail/latest/userguide/opt-in-regions-for-lightsail-enable.html)

#### Previous topic:

[IPv6 compatible blueprints](https://docs.aws.amazon.com/lightsail/latest/userguide/ipv6-only-blueprints.html)

## Supported AWS Regions in Amazon Lightsail

![Supported AWS Regions in Amazon Lightsail](https://docs.aws.amazon.com/images/lightsail/latest/userguide/images/amazon-lightsail-regions_720.png)

Close

## How Availability Zones work in Amazon Lightsail

![How Availability Zones work in Amazon Lightsail](https://docs.aws.amazon.com/images/lightsail/latest/userguide/images/amazon-lightsail-availability-zones-example.png)

Close