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

 [Skip to main content](https://aws.amazon.com/vpc/pricing/#aws-page-content-main)

Amazon VPC

- More


# Amazon VPC pricing

[Get started for free](https://portal.aws.amazon.com/gp/aws/developer/registration/index.html?pg=vpcprice&cta=herobtn)

[Request a pricing quote](https://aws.amazon.com/contact-us/sales-support/?pg=vpcprice&cta=herobtn)

- NAT Gateway


- IPAM


- Network Analysis


- Public IPv4 Address


- Amazon-provided contiguous IPv4 block


- VPC Route Server


- VPC Peering


- ODB Peering


- VPC Encryption Controls



- NAT Gateway


- **NAT Gateway Pricing**



If you choose to create a NAT gateway in your VPC, you are charged for each “NAT Gateway-hour" that your gateway is provisioned and available. Data processing charges apply for each gigabyte processed through the NAT gateway regardless of the traffic’s source or destination. Each partial NAT Gateway-hour consumed is billed as a full hour. You also incur standard AWS data transfer charges for all data transferred via the NAT gateway. If you no longer wish to be charged for a NAT gateway, simply delete your NAT gateway using the AWS Management Console, command line interface, or API.

















* * *



















Region:

















































































































* * *





**NAT Gateway - Pricing example**



Let’s assume you created a NAT gateway and you have an EC2 instance routing to the internet through the NAT gateway. Your EC2 instance behind the NAT gateway sends a 1 GB file to one of your Amazon Simple Storage Service (Amazon S3) buckets. The EC2 instance, NAT gateway, and S3 Bucket are in the same region of the US East (Ohio), and the NAT gateway and EC2 instance are in the same Availability Zone. We calculate your cost as follows:





  - **NAT Gateway Hourly Charge:** NAT Gateway is charged on an hourly basis. For this region, the rate is $0.045 per hour.
  - **NAT Gateway Data Processing Charge:** 1 GB data went through the NAT gateway. The Data Processing charge will result in a charge of $0.045.
  - **Data Transfer Charge:** This is the standard EC2 Data Transfer charge. 1 GB data was transferred from the EC2 instance to S3 via the NAT gateway. There was no charge for the data transfer from the EC2 instance to S3, as it is Data Transfer Out to Amazon EC2 to S3 in the same region. There was also no charge for the data transfer between the NAT gateway and the EC2 instance since the traffic stays in the same Availability Zone using private IP addresses. There will be data transfer charges between your NAT gateway and EC2 instance if they are in a different Availability Zone.

Please visit the Data Transfer section of the [Amazon EC2 Pricing](https://aws.amazon.com/ec2/pricing/on-demand/) page for more details.

In summary, your charge will be $0.045 for 1 GB data processed by the NAT gateway, and a charge of $0.045 per hour will always apply once the NAT gateway is provisioned and available. The data transfer has no charge in this example. However, if you send the file to a non-AWS internet location instead, there will be a data transfer charge, as it is Data Transfer Out from Amazon EC2 to the internet.

**Note:** To avoid the NAT Gateway Data Processing charge in this example, you could set up a gateway Type VPC endpoint and route the traffic to/from S3 through the VPC endpoint instead of going through the NAT Gateway. There are no data processing or hourly charges for using Gateway Type VPC endpoints. For details on how to use VPC endpoints, please visit [VPC Endpoints Documentation](https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints.html).

* * *

**Regional NAT Gateway Pricing** If you choose to create a NAT gateway with regional availability in your VPC, you are charged for each hour that the NAT Gateway is configured in each availability zone. For example, if your regional NAT is running across three Availability Zones(AZs) for one hour, you'll be billed for three 'NAT Gateway-hours'. When your regional NAT removes support from an AZ following changes in your workload footprint, billing automatically adjusts - you'll stop incurring charges for that specific AZ. Data processing charges apply for each gigabyte processed through the NAT gateway regardless of the traffic's source or destination. Each partial NAT Gateway-hour consumed is billed as a full hour. You also incur standard AWS data transfer charges for all data transferred via the NAT gateway. If you no longer wish to be charged for a NAT gateway, simply delete your NAT gateway using the AWS Management Console, command line interface, or API.

* * *

Region:

**Regional NAT Gateway - Pricing example** Let's assume you created a Regional NAT Gateway spanning three Availability Zones(AZs) and you have EC2 instances in each AZ routing to the internet through the Regional NAT Gateway. One of your EC2 instances behind the Regional NAT Gateway sends a 1 GB file to the internet. The EC2 instances and Regional NAT Gateway are all in the same region of US East (Ohio). We calculate your cost as follows:

**Regional NAT Gateway Hourly Charge:** The Regional NAT Gateway is charged on an hourly basis per AZ. For this region, the rate is $0.045 per hour per AZ. With three AZs, the hourly charges will amount to $0.045 x 3 = $0.135 per hour. This charge reflects the Regional NAT Gateway being provisioned across three AZs

**Regional NAT Gateway Data Processing Charge:** 1 GB data went through the Regional NAT Gateway. Data Processing charge will result in a charge of $0.045.

**Data Transfer Charge:** This is the standard EC2 Data Transfer charge for internet traffic. In this case, 1 GB of data flowed from the EC2 instance, through the Regional NAT Gateway, and out to the internet. With the Data Transfer Out to Internet rate set at $0.09 per GB, this resulted in a total data transfer charge of $0.09.

In summary, your charges will be $0.045 for 1 GB of data processed by the Regional NAT Gateway, and a charge of $0.045 per hour will always apply per AZ once the Regional NAT Gateway is provisioned and available. Additionally, since the data was transferred to a non-AWS internet location, there is a Data Transfer Out charge of $0.09 per GB. This results in a total charge of $0.27, which includes the hourly NAT Gateway usage ($0.135), data processing fee ($0.045), and the Data Transfer Out charge ($0.09).

Note: If the Regional NAT Gateway removes support from any AZ due to workload changes, the hourly charge will automatically adjust to reflect only the active AZs.

- IPAM


- Amazon VPC IP Address Manager (IPAM) makes it easier for you to plan, track, and monitor IP addresses for your AWS workloads. IPAM is offered in two tiers:



**IPAM Free Tier**


Use the Free Tier of IPAM to simplify IP address management for resources in a single AWS Region and account. In the Free Tier, you get the ability to manage Bring Your Own IP addresses (BYOIP v4 and v6) and Amazon provided contiguous IPv6 addresses. You also get visibility into your Public IPv4 usage through Public IP Insights. Please refer table below for a list of features available in the Free Tier. When you use the Free Tier, you do not pay for your usage of IPAM. However, you still pay for any other AWS service that you are using.





**IPAM Advanced Tier**


Use the Advanced Tier to simplify IP address management for resources across two or more AWS Regions or accounts. In the Advanced Tier, you get additional capabilities like private IPv4 management and auditing IP history. Please refer table below for a list of features available in the Advanced Tier. When you use the Advanced Tier, you pay an hourly rate of $0.00027 for each active IP address managed in IPAM.

















* * *



















Region:

















































































































* * *



#### Compare features across the two tiers





|     |     |     |
| --- | --- | --- |
| **Features** | **IPAM Free Tier** | **IPAM Advanced Tier** |
|  | _For IP address management in a single AWS Region and account_ | _For IP address management across two or more AWS Regions or accounts_ |
| **[Bring Your Own IP Address](https://docs.aws.amazon.com/vpc/latest/ipam/tutorials-byoip-ipam.html)** | Available | Available |
| **Amazon provided contiguous IPv6 blocks** | Available | Available |
| **[Public IP Insights](https://docs.aws.amazon.com/vpc/latest/ipam/view-public-ip-insights.html)** | Available | Available |
| [**Bring Your Own ASN**](https://docs.aws.amazon.com/vpc/latest/ipam/tutorials-byoasn.html) | Available | Available |
| **[Private IPv6 management](https://docs.aws.amazon.com/vpc/latest/ipam/intro-create-ipv6-pools.html)** | Available | Available |
| **Private IPv4 management** | Not Available | Available |
| **[Share IPAM pools with AWS accounts](https://docs.aws.amazon.com/vpc/latest/ipam/share-pool-ipam.html)** | Not Available | Available |
| [**Audit IP history**](https://docs.aws.amazon.com/vpc/latest/ipam/view-history-cidr-ipam.html) | Not Available | Available |







**Note:**



(1) Any feature not listed in the table above is available only in the Advanced tier





(2) Public IP Insights is available for two or more Regions and accounts in your AWS Org even in the Free Tier of IPAM



**IP Address Manager Pricing for Advanced Tier**



An active IP address is defined as an IP address or a prefix associated with an Elastic Network Interface (ENI) that is attached to a resource such as an EC2 Instance. IP addresses associated with ENIs that are not attached to any resource will not get billed. For example, you have a VPC with a /16 CIDR (65,536 IPv4 addresses) assigned to it, out of which you have assigned 2,000 IP addresses to ENIs that are attached to EC2 instances, and 1000 IP addresses assigned to ENIs not attached to any resource. IPAM will consider the 2,000 IP addresses as active, and will only charge you for those. Also, if you have associated a /28 IPv4 prefix or /80 IPv6 prefix to an ENI that is attached to an EC2 instance, IPAM will consider it as a single active address attachment and only charge you for the single unit.





IPAM tracks and monitors all the IP addresses assigned to resources in your VPCs, even if they are not part of an IPAM IP address pool. For example, you may have created ENIs with IP addresses in the past that do not belong to an existing IPAM pool. IPAM will still track the IP addresses (assignments, overlaps, etc.) and charge you for the active IP addresses. If you no longer wish to be charged for IPAM, simply delete your IPAM using the AWS Management Console, AWS Command Line Interface, or API.







**IPAM - Pricing Example 1:**



In this example, you have 100 VPCs in your account, each with 10 Amazon provided active IPv4 addresses. You also have /24 (256  IP addresses) BYOIP addresses in your account, out of which 200 are active, used as Elastic IP addresses (EIP). You create a Free Tier IPAM in your account to manage your BYOIP addresses.



Total active IPs: 100 VPCs with 10 IPs each + 200 BYOIP = 1,200 IPs



You are charged $0 for the above IPAM usage since you have created your IPAM in the Free Tier. You may still get charged for the Amazon provided IPv4 addresses or any other AWS service that you are using in your environment.











**IPAM - Pricing Example 2:**



In this example, you have one existing VPC with a /16 CIDR (65,536 IPv4 addresses) assigned to it, out of which you are using 2000 IP addresses on EC2 instances. Now, you create an IPAM in the Advanced Tier, in your account, and use it to assign a /16 CIDR (65,536 IPv4 addresses) to a new VPC, and use 5,000 IP addresses on EC2 instances in this VPC.



Total active IP addresses are 7,000 (2,000 + 5,000), and these addresses are active for 30 days, 24 hours a day. You will be charged for the 7000 active IP addresses.



Hourly price per active IP address is $0.00027.



7000 active IP addresses x 30 days x 24 hours x $0.00027 hourly charge = $1,360.80.



This will result in a monthly charge of $1,360.80.











**IPAM - Pricing Example 3:**



In this example, you have a /28 prefix (16 IPv4 addresses) assigned to each of your 50 network interfaces, and you have /80 (approximately 300 trillion IPv6 addresses) prefix assigned to 100 other network interfaces in your VPC. Each prefix that you assign to a network interface counts as a single active address attachment for IPAM. You also have 1,000 IPv4 addresses that are assigned to EC2 instances in the VPC.Also, other member accounts in your AWS Organization have a total of 10,000 active IPs. You create an Advanced Tier IPAM that is integrated with your AWS Organization.



Hourly price per active IP address is $0.00027.



(50 prefixes + 100 prefixes + 1,000 IP addresses + 10,000 IPs from member accounts) x 30 days x 24 hours x $0.00027 hourly charge = $2,167.56



This will result in a monthly charge of $2,167.56.

- Network Analysis


- **Traffic Mirroring Pricing**



If you choose to enable traffic mirroring on Amazon EC2 Instance elastic network interfaces (ENIs), ENI owner pays hourly for each ENI that is enabled with traffic mirroring. If you no longer wish to be charged for traffic mirroring, delete the traffic mirroring session associated to the instance/ENI using the AWS Management Console, command line interface, or API.



Note: You'll continue to be charged for Traffic Mirroring until you delete all active traffic mirror sessions. For example, you'll still be charged in the following scenarios:



1. You detached the network interface from the mirror source but do not delete the relevant traffic mirroring session.
2. You stopped or terminated the mirror source but do not delete the relevant traffic mirroring session.
3. You changed the instance type of the mirror source to an unsupported instance type but do not delete the relevant traffic mirroring session.


* * *

Region:

* * *

**Traffic Mirroring – pricing example**

You enable traffic mirroring sessions on five ENIs in your Amazon VPC in the US East (Ohio). Traffic mirroring sessions were active for 30 days, 24 hours a day. You will be charged on an hourly basis, for each hour the traffic mirroring sessions were active on ENIs for US East (Ohio) Region, the hourly rate is $0.015.

5 sessions x 30 days x 24 hr/day x $0.015 per session-hr = $54.

This will result is a charge of $54.

If account A shared subnet-1 with account B, account B then created an eni-1 in subnet-1, and account A then enabled traffic mirroring on eni-1, account B will be charged for the traffic mirroring usage.

* * *

**Reachability Analyzer Pricing**

* * *

Region:

**Reachability Analyzer - pricing example**

Let's assume you analyze the connectivity between two instances ten times.

You will be charged for each analysis, the price per analysis processed is $0.10.

10 connections x $0.10 per connection = $1.

This will result in a charge of $1.

Note: There are no additional charges for using Reachability Analyzer with [Amazon Q network troubleshooting](https://docs.aws.amazon.com/vpc/latest/reachability/amazon-q-network-troubleshooting.html) during preview. For additional information on pricing, visit the [Amazon Q Business pricing](https://aws.amazon.com/q/business/pricing/) or [Amazon Q Developer pricing](https://aws.amazon.com/q/developer/pricing/) pages.

* * *

**Network Access Analyzer Pricing**

You pay for the number of Amazon EC2 Instance elastic network interfaces (ENIs) analyzed when you run a network assessment using Network Access Analyzer.

* * *

Region:

**Network Access Analyzer - pricing example**

Let’s say you run 5 network assessments using Network Access Analyzer, and each of those network assessments analyzed 1000 ENIs. You will be charged for each ENI that is analyzed.

5 network assessments x 1000 ENIs X $0.002 per ENI analysis = $10.

This will result in a charge of $10.

- Public IPv4 Address


- - **What is a public IPv4 address?**


       A public IPv4 address is an IPv4 address that is routable from the internet. A public IPv4 address is necessary for a resource to be directly reachable from the internet over IPv4.
  - **How do public IPv4 address work with AWS services?**


     Nearly all resources you launch in your VPC come with an IP address for connectivity. While the vast majority of resources in your VPC use private IPv4 addresses (RFC1918), resources that require direct access to the internet over IPv4 use public IPv4 address. For example, EC2 instances that launch in a default VPC come with a public IPv4 address. You use Elastic IP addresses and attach them to resources such as Elastic Load Balancer, NAT Gateway etc. Also, there are AWS services such as Amazon EKS, Amazon EMR, Amazon ECS, Amazon RDS, Amazon Workspaces that create resources in your VPC with public IPv4 addresses associated with them to provide internet connectivity. Finally, there are public IPv4 address that you use with services such as AWS Global Accelerator, AWS Site-to-Site VPN that may not directly be in their VPC but are associated with AWS resources they use.
  - **What type of public IPv4 address is charged?**


     Any public IPv4 address associated with a resource launched in an Amazon VPC, and public IPv4 addresses assigned to AWS Global Accelerator and AWS Site-to-Site VPN tunnel endpoints are charged as in-use public IPv4 address. Any public IPv4 address associated to your AWS account that is not used on a resource is charged as idle public IPv4 address. Public IPv4 addresses that are not dedicated to your resource are not charged; for example, public IPv4 addresses associated with Amazon S3 that are not dedicated per S3 bucket. For a list of AWS services where you are charged for public IPv4 addresses, refer to the public [IPv4 documentation page.](https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html#pricing)
  - **How does public IPv4 address pricing work?**


     You pay an hourly rate for each public IPv4 address used by your AWS account. The bill is calculated in one-second increments, with a minimum of 60 seconds. The price is the same whether the public IPv4 address is in-use public IPv4 addresses that is associated with an AWS resource you own, or an idle public IPv4 addresses in your AWS account not associated with any AWS resources.




     Hourly charge for In-use Public IPv4 Address $0.005


     Hourly charge for Idle Public IPv4 Address $0.005

Public IPv4 address - Pricing example 1

In this example, you have

• Three Amazon EC2 instances, with one in-use public IPv4 address each

• One Elastic load balancer with two in-use public IPv4 address

• One Amazon RDS database that has one in-use public IPv4 address

• Four Idle Elastic IP addresses in your AWS account.

Total in-use public IPv4 addresses are 6 (3+2+1), and these addresses are active for 30 days, 24 hours a day. You will be charged for the 6 in-use public IPv4 addresses.

Total idle public IPv4 addresses are 4, and these addresses are active for 30 days, 24 hours a day. You will be charged for the 4 idle public IPv4 addresses.

Hourly Price per in-use public IPv4 address is $0.005

Hourly Price per idle public IPv4 address is $0.005

6 in-use public IPv4 addresses x 30 days x 24 hours x $0.005 hourly charge = $21.60.

4 idle public IPv4 addresses x 30 days x 24 hours x $0.005 hourly charge = $14.40.

This will result in a monthly charge of $36.00

Public IPv4 address - Pricing example 2

In this example, you have

• One AWS Global Accelerator that provides two static IPv4 addresses

• Five Elastic IP addresses associated to EC2 instances.

Total in-use public IPv4 addresses are 7 (2+5), and these addresses are active for 30 days, 24 hours a day. You will be charged for the 7 in-use public IPv4 addresses.

Hourly Price per in-use public IPv4 address is $0.005

7 in-use public IPv4 addresses x 30 days x 24 hours x $0.005 hourly charge = $25.20.

This will result in a monthly charge of $25.20

  - **In what AWS locations does public IPv4 address pricing apply?**


     In-use and idle public IPv4 address pricing applies across all AWS commercial, US GovCloud, and AWS China regions, and AWS Local Zones.

  - **What public IPv4 address is not charged?**


     You can bring your IPv4 space to AWS with [Bring Your Own IP](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-byoip.html) (BYOIP) or [Customer-owned IP addresses](https://docs.aws.amazon.com/outposts/latest/userguide/routing.html#ip-addressing) (COIP) feature (only available at AWS Outpost). These public IPv4 addresses are not charged.
  - **How can I monitor public IPv4 address that I use?**


     You can monitor your public IPv4 usage with [Public IP Insights](https://docs.aws.amazon.com/vpc/latest/ipam/what-it-is-ipam.html), an Amazon VPC IP Address Manager feature that allows you to track, manage and monitor public IPv4 addresses across your AWS accounts in an AWS organization. This also enables you to identify where you have IPv4 address that you are not actively using for your AWS resource today to release it back to AWS and avoid the charge. You can also find opportunities to reduce how many IPv4 addresses a particular application is using by looking at aggregate usage across resources.
  - **How can I track public IPv4 address usage and estimate charges?**

    [AWS Cost and Usage Reports](https://docs.aws.amazon.com/cur/latest/userguide/what-is-cur.html) allow you to track your public IPv4 usage and aggregate the information either by the hour, day, or month. You can also choose to include individual resource IDs that contain the ID of the resource that you provisioned to use the public IPv4 address. The [IPv4 efficiency blog](https://aws.amazon.com/blogs/networking-and-content-delivery/identify-and-optimize-public-ipv4-address-usage-on-aws/) explains how you can estimate charges.


- Amazon-provided contiguous IPv4 block


- Amazon-provided contiguous IPv4 block allows you to get sequential public IPv4 addresses to simplify networking and security allowlisting needs.



**How does Amazon-provided contiguous IPv4 block pricing work?**


You pay an hourly rate for each public IPv4 address in the Amazon-provided contiguous IPv4 block. The bill is calculated in hourly increments, and partial hour is billed as a full hour.




Hourly charge for each public IPv4 address in the Amazon-provided contiguous IPv4 blocks $0.008



This pricing applies across all AWS commercial, US GovCloud regions, and AWS Local Zones.



Amazon-provided contiguous IPv4 - Pricing Example 1:




In this example, you have





  - A /30 Amazon-provided contiguous IPv4 block provisioned in your AWS account.

Amazon-provided contiguous IPv4 block size: /30

Total public IPv4 address in the Amazon-provided contiguous IPv4 block: 4

Hourly charge for each public IPv4 address in the Amazon-provided contiguous IPv4 block: $0.008 per public IPv4 address per hour

4 public IPv4 address in the Amazon-provided contiguous IPv4 block x 30 days x 24 hours x $0.008 hourly charge per public IPv4 = $23.04.

This will result in a monthly charge of $23.04

Amazon-provided contiguous IPv4 - Pricing Example 2:

In this example, you have

  - A /29 Amazon-provided contiguous IPv4 block provisioned in your AWS account.
  - Created 4 Elastic IP address from the Amazon-provided contiguous IPv4 block that are used on EC2 instances
  - Created 2 Elastic IP address from the Amazon-provided contiguous IPv4 block that are Idle in your AWS account.


Amazon-provided contiguous IPv4 block size: /29

Total public IPv4 address in the Amazon-provided contiguous IPv4 block: 8

Hourly charge for each public IPv4 address in the Amazon-provided contiguous IPv4 block: $0.008 per public IPv4 address per hour

8 public IPv4 address in the Amazon-provided contiguous IPv4 block x 30 days x 24 hours x $0.008 hourly charge per public IPv4 = $46.08.

This will result in a monthly charge of $46.08

**Note:** All public IPv4 addresses in Amazon-provided contiguous IPv4 block are charged at the time of provisioning the Amazon-provided contiguous IPv4 block to your AWS account. You are not charged separately for in-use and idle public IPv4 address for public IPv4 addresses in Amazon-provided contiguous IPv4 block.

- VPC Route Server


- * * *



















Region:













































































































* * *

- VPC Peering


- Data sent over VPC peering connections that crosses an Availability Zone within the same AWS Region is charged at $0.01/GB in both "In" and "Out" direction.



Data sent over VPC peering connections between a Local Zone and an Availability Zone within the same AWS Region is charged in both "In" and "Out" direction at the following rate:





* * *





|     |     |     |
| --- | --- | --- |
| **Local Zone** | **VPC Peering In (/GB)** | **VPC Peering Out (/GB)** |
| US East (Minneapolis) | $0.01 | $0.01 |
| US East (Boston) | $0.01 | $0.01 |
| US East (Chicago) | $0.01 | $0.01 |
| US East (Dallas) | $0.01 | $0.01 |
| US East (Houston) | $0.01 | $0.01 |
| US East (Kansas City 2) | $0.01 | $0.01 |
| US East (Miami) | $0.01 | $0.01 |
| US East (Minneapolis) | $0.01 | $0.01 |
| US East (New York City) | $0.01 | $0.01 |
| US East (Philadelphia) | $0.01 | $0.01 |
| US West (Denver) | $0.01 | $0.01 |
| US West (Honolulu) | $0.022 | $0.022 |
| US West (Las Vegas) | $0.01 | $0.01 |
| US West (Phoenix) | $0.01 | $0.01 |
| US West (Portland) | $0.01 | $0.01 |
| US West (Seattle) | $0.01 | $0.01 |
| Mexico (Queretaro) | $0.01 | $0.01 |
| Nigeria (Lagos) | $0.137 | $0.137 |
| Australia (Perth) | $0.088 | $0.088 |
| India (Delhi) | $0.076 | $0.076 |
| India (Kolkata) | $0.076 | $0.076 |
| New Zealand (Auckland) | $0.088 | $0.088 |
| Philippines (Manila) | $0.08 | $0.08 |
| Taiwan (Taipei) | $0.08 | $0.08 |
| Thailand (Bangkok) | $0.08 | $0.08 |
| Denmark (Copenhagen) | $0.01 | $0.01 |
| Finland (Helsinki) | $0.01 | $0.01 |
| Germany (Hamburg) | $0.01 | $0.01 |
| Poland (Warsaw) | $0.01 | $0.01 |
| Oman (Muscat) | $0.101 | $0.101 |
| Argentina (Buenos Aires) | $0.128 | $0.128 |
| Chile (Santiago) | $0.128 | $0.128 |
| Peru (Lima) | $0.128 | $0.128 |







For cross region charges, see [Amazon EC2 Pricing](https://aws.amazon.com/ec2/pricing/on-demand/).

- ODB Peering


- Data sent over ODB peering connections that crosses an Availability Zone within the same AWS Region is charged at $0.01/GB in both "In" and "Out" direction.







* * *

- VPC Encryption Controls


- **VPC Encryption Controls Pricing**



**What is VPC Encryption Controls?**


VPC Encryption controls is a security and compliance feature that provides centralized control to monitor and enforce encryption of traffic flows within and across VPCs in a region. VPC Encryption Controls can be enabled in two modes: “monitor” and “enforce”.





Monitor mode provides visibility into encryption status of traffic flows, helps identify non-compliant resources, and populates VPC flow logs with encryption status information.





Enforce mode prevents the creation or attachment of resources that allow unencrypted traffic within the VPC boundary. For Example: You will be blocked from running instances that don’t support native nitro encryption..



**How does VPC Encryption Controls pricing work?**


You are charged a flat rate (based on region) per hour for every non-empty VPC (VPC that has a network interface in it) that is running Encryption Controls in either “monitor” or “enforce” mode. You can also enable ‘Encryption Support' on your Transit Gateway to encrypt traffic at the hardware layer between your VPCs.





There are no separate charges for turning on encryption support on your Transit Gateway when it is used with VPCs that have encryption controls turned on. We recommend turning on Encryption Controls in all VPCs attached to a Transit Gateway with encryption support. VPC Owners are charged for Encryption Controls for all VPCs that are attached to Transit Gateways with encryption support, regardless whether the VPCs have encryption controls turned on.



An Encryption Controls enabled VPC that is attached to multiple Transit Gateways that have Encryption Support enabled will only be charged once per hour.



_**Note**: You can connect VPCs that have encryption controls off or in Monitor or Enforce mode to a Transit Gateway that has Encryption Support Enabled. You cannot connect a VPC in Enforce mode to a Transit Gateway that has Encryption Support disabled._







|     |     |
| --- | --- |
| **Region** | **Price per Non-empty VPC per hour** |
| US East (N. Virginia) | $0.15 |
| US East (Ohio) | $0.15 |
| US West (Oregon) | $0.15 |
| US West (N. California) | $0.16 |
| Europe (Frankfurt) | $0.17 |
| Europe (Ireland) | $0.16 |
| Europe (London) | $0.17 |
| Europe (Milan) | $0.17 |
| Europe (Paris) | $0.17 |
| Europe (Stockholm) | $0.15 |
| Europe (Zurich) | $0.19 |
| Asia Pacific (Hong Kong) | $0.22 |
| Asia Pacific (Hyderabad) | $0.19 |
| Asia Pacific (Jakarta) | $0.20 |
| Asia Pacific (Melbourne) | $0.20 |
| Asia Pacific (Mumbai) | $0.19 |
| Asia Pacific (Osaka) | $0.21 |
| Asia Pacific (Singapore) | $0.20 |
| Asia Pacific (Sydney) | $0.20 |
| Asia Pacific (Tokyo) | $0.21 |
| Canada West (Calgary) | $0.17 |
| Canada (Central) | $0.16 |
| Middle East (UAE) | $0.18 |
| Middle East (Bahrain) | $0.18 |
| Africa (Cape Town) | $0.19 |
| Mexico (Central) | $0.16 |
| South America (Sao Paulo) | $0.31 |
| Asia Pacific (Taipei) | $0.19 |
| AsiaPacific (Seoul) | $0.20 |
| AsiaPacific (Malaysia) | $0.17 |
| AsiaPacific (New Zealand) | $0.20 |
| AsiaPacific (Thailand) | $0.17 |
| Europe (Spain) | $0.16 |
| Israel (Tel Aviv) | $0.17 |
| USEast-GovCloud (AWS GovCloud (US-East)) | $0.18 |
| USWest-GovCloud (AWS GovCloud (US-West)) | $0.18 |





* * *









**VPC Encryption Controls pricing Examples**





1\. Let’s assume you have 5 VPCs running in US East (N. Virginia). 3 of them have network interfaces in them and 2 of them are empty. All 5 VPCs are running in either monitor or enforce mode and none of the VPCs are attached to any Transit Gateways. You will be charged as follows per hour:



_3 VPCs (non-empty) \* $0.15 = $0.45 per hour_



2\. Let’s assume you have 5 VPCs running in US East (N. Virginia). 3 of them have network interfaces in them and 2 of them are empty. All 5 VPCs are running in monitor or enforce mode and are attached to a Transit Gateway that has Encryption Support enabled. You will be charged for all VPCs since the two non-empty VPCs are attached to a Transit Gateway that has Encryption Support Enabled. You will be charged as follows per hour:



_3 VPCs (non-empty) \* $0.15 + 2 VPCs \* $0.15 = $0.75 per hour_



3\. Let’s assume you have 5 VPCs running in US East (N. Virginia). 3 of them have network interfaces in them and are running in monitor or enforce mode and other 2 VPCs are empty and do not have Encryption Controls turned on in either mode. All 5 VPCs are attached to a Transit Gateway that has Encryption Support enabled. You will be charged for all VPCs since the two empty VPCs are attached to a Transit Gateway that has Encryption Support Enabled. You will be charged as follows per hour:



_3 VPCs (non-empty) \* $0.15 + 2 VPCs (no encryption controls) \* $0.15 = $0.75 per hour_



4\. Let’s assume you have 1 VPCs (empty or non-empty) running in US East (N. Virginia) with Encryption Controls mode in monitor or enforce. It is attached to two TGWs that have encryption support enabled.


In this case, you will only be charged once per hour for the VPC. You will be charged as follows per hour:



_1 VPC (empty or non-empty) \* $0.15 = $0.15 per hour_



5\. Let’s assume you have 5 VPCs running in US East (N. Virginia). 3 of them have network interfaces in them and are running in monitor mode and other 2 VPCs (empty or non-empty) are running with Encryption Controls disabled/off. All 5 VPCs are connected to a Transit Gateway with Encryption Support disabled. (Note: You cannot have a VPC running in enforce mode connected to a Transit Gateway in Encryption Support disabled).



In this case, you will only be charged for the 3 VPCs running with Encryption Controls in monitor mode.



_3 VPCs (non-empty) \* $0.15 = $0.45 per hour_


Close [Amazon VPC Features](https://aws.amazon.com/vpc/features/) [VPC Lattice](https://aws.amazon.com/vpc/lattice/) [IPv6 on AWS](https://aws.amazon.com/vpc/ipv6/)

Hi, I can connect you with an AWS representative or answer questions you have on AWS.

Need more info? Highlight any text to get an explanation generated with AWS generative AI.

2